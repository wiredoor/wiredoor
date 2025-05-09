function filter_valid_email(tag, ts, record)
  if record["email"] == nil or record["email"] == "-" then
      return 0
  end
  return 1, ts, record
end