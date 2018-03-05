import Promise from './promise';
import window from 'global';

export default class WorkerAsyncQueue {
  /**
   * Create worker queue spawning workers from given url
   *
   * number of workers depends on a hardware concurrency
   *
   * @param {String} url
   * @return {WorkAsyncQueue}
  **/
  constructor(url) {
    var numworkers = Math.max(2, window.navigator.hardwareConcurrency|0);
    this.available = [];
    this.busy = new Map();
    this.pending = [];
    Array.from({length: numworkers}, () => new window.Worker(url))
         .forEach(w => {
            w.onmessage = (e) => this._onmessage(w, e);
          });
    this._readyPromise = new Promise((resolve, reject) => {
      this.notify = resolve;
    });
  }

  /**
   * Resolves when at least one worker becomes ready
   *
   * workers must send "ready" string upon initialization
   *
   * @return {Promise}
  **/
  ready() {
    return this._readyPromise;
  }

  /**
   * Send data to available worker or queue it
   *
   * returns promise which resolves with the worker's answer
   *
   * see Worker.postMessage for argument details
   *
   * @param {Object} data
   * @param {Array} [transfer]
   * @return {Promise}
  **/
  task(data, transfer) {
    const available = this.available;
    return new Promise((resolve, reject) => {
      let task = {data, transfer, resolve, reject};
      let worker = available.shift();
      if (worker) {
        this._dispatch(worker, task);
      }
      else {
        this.pending.push(task);
      }
    });
  }

  /**
   * Cancel pending tasks only
   *
   * Lets all in-progress tasks to be finished
   *
   * All pending task promises will be rejected with error message: "job canceled"
  **/
  cancelPending() {
    for(let task of this.pending) {
      task.reject(new Error("job canceled"));
    }
    this.pending.length = 0;
  }

  /**
   * Cancel all pending and in-progress tasks
   *
   * All unresolved task promises will be rejected with error message: "job canceled"
  **/
  cancel() {
    this.cancelPending()
    for(let task of this.busy.values()) {
      task.reject(new Error("job canceled"));
    }
    this.busy.clear();
  }

  _onmessage(worker, e) {
    if (e.data === "ready") {
      this.notify(this);
    }
    else {
      const busy = this.busy;
      let task = busy.get(worker);
      if (task) {
        busy.delete(worker);
        task.resolve(e.data);
      }
    }

    this._dispatch(worker, this.pending.shift());
  }

  _dispatch(worker, task) {
    if (task) {
      this.busy.set(worker, task);
      worker.postMessage(task.data, task.transfer);
    }
    else {
      this.available.push(worker);
    }
  }
}
