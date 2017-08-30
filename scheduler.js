define([], function () {
    "use strict";

    const MaxHeadroom = 0xffffffff;

    function Scheduler() {
        this.scheduled = null;
        this.epoch = 0;
    };

    function Task(scheduler, onExpire) {
        this.scheduler = scheduler;
        this.prev = this.next = null;
        this.expireEpoch = 0;
        this.onExpire = onExpire;
        this._scheduled = false;
    };

    Scheduler.prototype.schedule = function (task, delay) {
        if (task.scheduler !== this) {
            throw new Error("Wrong scheduler for task, or non-task");
        }
        if (task.scheduled()) {
            throw new Error("Task is already scheduled");
        }

        var expireEpoch = delay + this.epoch;
        task.expireEpoch = expireEpoch;
        task._scheduled = true;

        var before = this.scheduled;
        var prev = null;
        while (before && before.expireEpoch <= expireEpoch) {
            prev = before;
            before = before.next;
        }
        task.next = before;
        task.prev = prev;
        if (task.next) task.next.prev = task;
        if (task.prev) {
            task.prev.next = task;
        } else {
            this.scheduled = task;
        }
    };

    Scheduler.prototype.cancel = function (task) {
        if (!task.scheduled()) return;
        if (!task.prev) {
            // First element, we need to update the head element.
            this.scheduled = task.next
        } else {
            task.prev.next = task.next;
        }
        if (task.next) {
            task.next.prev = task.prev;
        }
        task.next = task.prev = null;
        task._scheduled = false;
    };

    Scheduler.prototype.polltime = function (ticks) {
        this.epoch += ticks;
        while (this.scheduled && this.scheduled.expireEpoch <= this.epoch) {
            this.scheduled.onExpire();
            this.scheduled.cancel();
        }
    };

    Scheduler.prototype.headroom = function () {
        if (this.scheduled === null) return MaxHeadroom;
        return this.scheduled.expireEpoch - this.epoch;
    };

    Scheduler.prototype.newTask = function (onExpire) {
        return new Task(this, onExpire);
    };

    Task.prototype.scheduled = function () {
        return this._scheduled;
    };

    Task.prototype.schedule = function (delay) {
        this.scheduler.schedule(this, delay);
    };

    Task.prototype.cancel = function (delay) {
        this.scheduler.cancel(this);
    };

    return {Scheduler: Scheduler};
});