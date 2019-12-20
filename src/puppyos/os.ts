
import { LineEvent, OutputEvent, ActionEvent, newEventId } from './events';

export class PuppyEventHandler {
  private eventMap: { [key: string]: ((event: any) => void)[] } = {};

  public addEventListener(key: string, callback: (event: any) => void) {
    if (this.eventMap[key] === undefined) {
      this.eventMap[key] = [];
    }
    this.eventMap[key].push(callback);
  }

  public trigger(key: string, event: any) {
    const callbacks = this.eventMap[key];
    if (callbacks !== undefined) {
      event.trigger = key;
      for (const callback of callbacks) {
        callback(event);
      }
    }
    //console.log(event); // for debugging
  }

  public syslog(channel: 'stdout' | 'stderr' | 'verbose' | 'debug', text: any) {
    if (channel in this.eventMap) {
      const event: OutputEvent = {
        id: newEventId(),
        type: channel,
        text: `${text}`,
      }
      this.trigger(channel, event);
    }
    console.log(`${channel} ${text}`);
  }
}

export class PuppyOS extends PuppyEventHandler {
  private uid: string;
  private env: { [key: string]: any }
  //  private vm: PuppyVM | null = null;

  public constructor(uid = 'guest') {
    super();
    this.uid = uid;
    const data = window.sessionStorage.getItem(this.filePath('settings.json'));
    this.env = data ? JSON.parse(data) : {}
    this.env['USER'] = uid;
  }

  // public newPuppyVM(element: HTMLElement) {
  //   this.vm = new PuppyVM(element, this);
  //   return this.vm;
  // }

  private filePath(fileName = 'settings.json') {
    return `/puppy/${this.uid}/${fileName}`;
  }

  private parseKeyValue(keyValue: string): [string, any] {
    const pos = keyValue.indexOf('=');
    if (pos === -1) {
      return [keyValue, true];
    }
    return [keyValue.substring(0, pos), keyValue.substring(pos + 1)];
  }

  public getenv(key: string, value: any) {
    const data = this.env[key];
    return data || value;
  }

  public setenv(key: string, value: any) {
    const oldValue = this.env[key];
    this.env[key] = value;
    const data = JSON.stringify(this.env);
    window.sessionStorage.setItem(this.filePath('settings.json'), data);
    if (oldValue !== value) {
      this.trigger('changed', { key, value, oldValue, env: this.env })
    }
  }

  public save(fileName: string, data: any) {
    data = JSON.stringify(data);
    window.sessionStorage.setItem(this.filePath(fileName), data);
  }

  public exec(cmd: string, args: string[] = []) {
    switch (cmd) {
      case 'set':
        const pair = this.parseKeyValue(args[0]);
        this.setenv(pair[0], pair[1]);
        return;
      // case 'submit':
      //   this.submit(args[0], args[1]);
      //   return;
      default:
        this.trigger('undefined', { cmd, args })
    }
  }

  public shell(cmd: string) {
    // if (cmd.startsWith('eval ') && this.vm !== null) {
    //   const source = cmd.substring(5);
    //   this.vm.eval(source);
    // }
    const splited = cmd.split(' ');
    if (splited.length > 1) {
      const command = splited[0];
      const args = splited.slice(1);
      this.exec(command, args);
    }
    else {
      if (cmd.indexOf('=') !== 0) {
        this.exec('set', [cmd]);
      }
      else {
        this.exec(cmd, []);
      }
    }
  }

}