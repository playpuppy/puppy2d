

var eventId = 0;

export const newEventId = () => {
  return eventId++;
}

// action, start, end
export type ActionEvent = {
  id: number;
  action: 'start' | 'end' | 'pause' | 'restart';
  type: 'run' | 'compile' | string;
}

// stdout, stderr, verbose, debug
export type OutputEvent = {
  id: number;
  type: 'stdout' | 'stderr' | 'verbose' | 'debug';
  text: string;   // 改行が含まれた文字列
}

// line
export type LineEvent = {
  id: number;
  type: 'next' | 'executed';
  row: number;  // linenum = row + 1
}
