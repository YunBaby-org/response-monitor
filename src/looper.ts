export class Looper {
  private readonly callback: Function;
  private interval: number;
  private stop: boolean;
  private setted: NodeJS.Timeout | undefined;

  constructor(interval: number, callback: Function) {
    this.interval = interval;
    this.callback = callback;
    this.stop = false;
  }

  private setupTimeout() {
    /* Invoke the following function after a period of time */
    return setTimeout(() => {
      if (!this.stop) {
        /* If the condition meet, invoke the callback and do the timeout again */
        this.callback();
        /* Keep the looper running by invoke another timeout */
        this.setted = this.setupTimeout();
      }
    }, this.interval);
  }

  public setNextInterval(next_interval: number) {
    this.interval = next_interval;
  }
  public addNextInterval(amount: number, minimum: number, maximum: number) {
    this.interval = Math.max(
      minimum,
      Math.min(maximum, this.interval + amount)
    );
  }

  public startLooper() {
    this.stop = false;
    this.setted = this.setupTimeout();
  }

  public stopLooper() {
    if (this.setted) {
      this.stop = true;
      this.setted.unref();
    }
  }
}
