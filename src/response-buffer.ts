/* ResponseItem Buffer */
/* This module used to store response into database, unlike usual approach. */
/* We don't store response one by one, instead we store it a bulk of responses for every insertion */
/* This will decrease the loading of database interaction */

import {IInsertResponseParams} from './query/tracker-requests.queries';

export type Response = IInsertResponseParams['responses'][0];

export class ResponseBuffer {
  private responseBuffer: Array<Response>;
  private responseState: Array<object | undefined>;

  public constructor() {
    this.responseBuffer = [];
    this.responseState = [];
  }

  public add(response: Response, state: object | undefined) {
    this.responseBuffer.push(response);
    this.responseState.push(state);
  }

  public refreshBufferContent() {
    const buffers = {
      responseBuffer: this.responseBuffer,
      state: this.responseState,
    };
    this.responseBuffer = [];
    this.responseState = [];
    return buffers;
  }
}
