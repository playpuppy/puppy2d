

export type PuppyStatus = {
  status: "loaded" | "running" | "resume";
}

export type ConsoleLog = {
  status: "stdout" | "stderr" | "verbose";
  text: string;
}

export interface SourceError {
  key: string;
  line: number;
  token: string;
  pos: number;
  column: number;
  row: number;
  length: number;
}

export class OutOfArrayIndex /* implements SourceError */ {
  public key: string;
  public index: number;
  public length: number;

  public constructor(index: number, length: number, tkid: any) {
    this.key = 'OutOfArrayIndex';
    this.index = index;
    this.length = length;
  }
}