function extract_domain(tag, timestamp, record)
  local log_path = record["log"]
  if log_path then
      local domain = log_path:match("/var/log/nginx/(.-)/access.log")
      if not domain then
          domain = "default"
      end
      record["domain"] = domain
  end
  return 1, record
end