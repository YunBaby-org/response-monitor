/** Types generated for queries found in "src/query/tracker-requests.sql" */
import {PreparedQuery} from '@pgtyped/query';

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | {[key: string]: Json};

/** 'InsertRequest' parameters type */
export interface IInsertRequestParams {
  requests: Array<{
    tracker_id: string | null | void;
    id: string | null | void;
    time: Date | null | void;
    request: Json | null | void;
  }>;
}

/** 'InsertRequest' return type */
export type IInsertRequestResult = void;

/** 'InsertRequest' query type */
export interface IInsertRequestQuery {
  params: IInsertRequestParams;
  result: IInsertRequestResult;
}

const insertRequestIR: any = {
  name: 'insertRequest',
  params: [
    {
      name: 'requests',
      codeRefs: {
        defined: {a: 35, b: 42, line: 3, col: 9},
        used: [{a: 181, b: 188, line: 6, col: 10}],
      },
      transform: {
        type: 'pick_array_spread',
        keys: ['tracker_id', 'id', 'time', 'request'],
      },
    },
  ],
  usedParamSet: {requests: true},
  statement: {
    body:
      'INSERT INTO public.tracker_requests(trackerid, request_id, delivery_time, request)\n  VALUES :requests',
    loc: {a: 88, b: 188, line: 5, col: 0},
  },
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO public.tracker_requests(trackerid, request_id, delivery_time, request)
 *   VALUES :requests
 * ```
 */
export const insertRequest = new PreparedQuery<
  IInsertRequestParams,
  IInsertRequestResult
>(insertRequestIR);

/** 'InsertResponse' parameters type */
export interface IInsertResponseParams {
  responses: Array<{
    tracker_id: string | null | void;
    id: string | null | void;
    time: Date | null | void;
    response: Json | null | void;
  }>;
}

/** 'InsertResponse' return type */
export type IInsertResponseResult = void;

/** 'InsertResponse' query type */
export interface IInsertResponseQuery {
  params: IInsertResponseParams;
  result: IInsertResponseResult;
}

const insertResponseIR: any = {
  name: 'insertResponse',
  params: [
    {
      name: 'responses',
      codeRefs: {
        defined: {a: 228, b: 236, line: 10, col: 9},
        used: [{a: 377, b: 385, line: 13, col: 10}],
      },
      transform: {
        type: 'pick_array_spread',
        keys: ['tracker_id', 'id', 'time', 'response'],
      },
    },
  ],
  usedParamSet: {responses: true},
  statement: {
    body:
      'INSERT INTO public.tracker_requests(trackerid, request_id, received_time, response)\n  VALUES :responses\n  ON CONFLICT (request_id) DO UPDATE SET\n    received_time = excluded.received_time,\n    response      = excluded.response',
    loc: {a: 283, b: 508, line: 12, col: 0},
  },
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO public.tracker_requests(trackerid, request_id, received_time, response)
 *   VALUES :responses
 *   ON CONFLICT (request_id) DO UPDATE SET
 *     received_time = excluded.received_time,
 *     response      = excluded.response
 * ```
 */
export const insertResponse = new PreparedQuery<
  IInsertResponseParams,
  IInsertResponseResult
>(insertResponseIR);
