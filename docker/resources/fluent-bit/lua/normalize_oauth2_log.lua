function normalize(tag, ts, record)
  record["status"] = tonumber(record["status"])
  record["size"] = tonumber(record["size"])
  record["request_time"] = tonumber(record["request_time"])
  return 1, ts, record
end