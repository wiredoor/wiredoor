function normalize(tag, ts, record)
  record["status"] = tonumber(record["status"])
  record["size"] = tonumber(record["size"])
  return 1, ts, record
end
