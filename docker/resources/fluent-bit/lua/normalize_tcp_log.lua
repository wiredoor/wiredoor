function normalize(tag, ts, record)
  record["bytes_sent"] = tonumber(record["bytes_sent"])
  record["bytes_received"] = tonumber(record["bytes_received"])
  record["session_time"] = tonumber(record["session_time"])
  record["status"] = tonumber(record["status"])
  return 1, ts, record
end