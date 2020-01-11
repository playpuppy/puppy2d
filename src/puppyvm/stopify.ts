export class PuppyStopify {

  private rtstack: IterableIterator<any>[] = [];
  private cps: any = null;
  private retval: any = undefined;
  private paused = false;
  private isSync: boolean = true;
  private nexting = () => { this.run(false); }
  private tracing = (line: number) => { };
  private ending = () => { this.stop(); }

  public constructor(isSync = true) {
    this.isSync = isSync;
  }

  public start(rt: IterableIterator<any>, ending = () => { this.stop(); }) {
    this.rtstack = [rt];
    this.paused = false;
    this.ending = ending;
    this.run(false);
  }

  public pause() {
    this.paused = true;
  }

  public stop() {
    if (!this.cps) {
      this.rtstack = [];
      clearTimeout(this.cps);
      this.cps = null;
      // const event: ActionEvent = {
      //   id: newEventId(),
      //   action: 'end',
      //   type: 'run'
      // };
      // this.trigger('end', event);
      // this.trigger('action', event);
    }
  }

  public run(isStep = false) {
    if (this.rtstack.length === 0) {
      return;
    }
    if (this.paused) {
      this.cps = setTimeout(() => { this.nexting() }, 100);
      return;
    }
    const rt = this.rtstack[this.rtstack.length - 1];
    var time = 0;
    var res = rt.next(this.retval);
    if (isStep) {
      this.pause();
    }
    this.retval = undefined;
    if (res.done) {
      this.retval = res.value;
      this.rtstack.pop(); // FIXME
      console.log(`returing ${this.retval}`);
    }
    else {
      var v = res.value;
      console.log(`yielding ${v}`);
      if (typeof v === 'number') {
        time = v % 1000;
        if (time !== 0) {
          this.tracing(v / 1000);
        }
      }
      else if (typeof v === 'string') {
        //TODO: this.logging(v);
      }
      else {
        const child_rt = v();
        this.rtstack.push(child_rt);
      }
    }
    if (this.rtstack.length > 0) {
      this.cps = setTimeout(this.nexting, this.isSync ? time : 0);
    }
    else {
      if (this.ending !== null) {
        this.cps = setTimeout(this.ending, 5000);
      }
    }
  }
}
