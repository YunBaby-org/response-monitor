/* 
  @name insertRequest
  @param requests -> ((id, time, request)...)
 */
INSERT INTO public.tracker_requests(request_id, delivery_time, request)
  VALUES :requests;

/* 
  @name insertResponse
  @param responses -> ((id, time, response)...)
 */
INSERT INTO public.tracker_requests(request_id, received_time, response)
  VALUES :responses
  ON CONFLICT (request_id) DO UPDATE SET
    received_time = excluded.received_time,
    response      = excluded.response;

