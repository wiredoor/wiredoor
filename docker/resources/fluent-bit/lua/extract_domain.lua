function extract_domain_http(tag, ts, record)
  local domain = string.match(tag, "nginx%.http%.domain%.var%.log%.nginx%.(.-)%.access%.log")

  if domain ~= nil then
    record["domain"] = domain
  else
    record["domain"] = "default"
  end

  return 1, ts, record
end

function extract_domain_stream(tag, ts, record)
  local domain, identifier = string.match(tag, "nginx%.stream%.domain%.var%.log%.nginx%.(.+)%.([%w_]+)_stream%.log")

  if domain ~= nil then
    record["domain"] = domain
  else
    record["domain"] = "default"
  end

  return 1, ts, record
end