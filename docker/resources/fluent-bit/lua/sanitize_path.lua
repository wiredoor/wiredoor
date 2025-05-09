function strip_query(tag, ts, record)
  local path = record["path"]
  if path ~= nil then
      local clean = string.match(path, "^[^?]+")
      record["path"] = clean
  end
  return 1, ts, record
end
