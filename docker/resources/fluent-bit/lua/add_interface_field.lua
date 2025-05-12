function add_interface_field(tag, timestamp, record)
    local iface = string.match(tag, "%.net%.(.*)")
    if iface ~= nil then
        record["interface"] = iface
    end
    return 1, timestamp, record
end