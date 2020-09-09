/* ResponseItem Buffer */
/* This module used to store response into database, unlike usual approach. */
/* We don't store response one by one, instead we store it a bulk of responses for every insertion */
/* This will decrease the loading of database interaction */

import {IInsertResponseParams} from './query/tracker-requests.queries';

export type Response = IInsertResponseParams['responses'][0];
export type ResponseCallback = (state: object) => void;

export class ResponseBuffer {
  private responseBuffer: Array<Response>;
  private responseSuccessCallback: Array<ResponseCallback>;
  private responseFailureCallback: Array<ResponseCallback>;
  private responseState: Array<object | undefined>;

  public constructor() {
    this.responseBuffer = [];
    this.responseSuccessCallback = [];
    this.responseFailureCallback = [];
    this.responseState = [];
  }

  public add(
    response: Response,
    success: ResponseCallback,
    failure: ResponseCallback,
    state: object | undefined
  ) {
    this.responseBuffer.push(response);
    this.responseSuccessCallback.push(success);
    this.responseFailureCallback.push(failure);
    this.responseState.push(state);
  }

  public refreshBufferContent() {
    const buffers = {
      responseBuffer: this.responseBuffer,
      responseSuccessCallback: this.responseSuccessCallback,
      responseFailureCallback: this.responseFailureCallback,
      state: this.responseState,
    };
    this.responseBuffer = [];
    this.responseSuccessCallback = [];
    this.responseFailureCallback = [];
    this.responseState = [];
    return buffers;
  }
}
