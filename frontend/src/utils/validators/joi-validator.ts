import Joi from 'joi';

export default Joi.defaults((schema) => {
  return schema.messages({
    'any.required': 'This field is required',
    'any.unknown': '{{#label}} is not allowed',
    'any.allowOnly': 'This field doesn`t match with required values',
    'any.valid':
      'This field must be {if(#valids.length == 1, "", "one of ")}{{#valids}}',
    'any.only':
      'This field must be {if(#valids.length == 1, "", "one of ")}{{#valids}}',
    'any.invalid': 'This field contains an invalid value',
    'any.empty': 'This field shouldn`t be empty',
    'string.base': 'This field must be a valid string',
    'string.alphanum': 'This field must only contain alpha-numeric characters',
    'string.email': 'This field must be a valid email',
    'string.empty': 'This field is not allowed to be empty',
    'string.min': 'This field must be at least {{#limit}} characters long',
    'string.max':
      'This field must be less than or equal to {{#limit}} characters long',
    'string.length': 'This field must be {{#limit}} characters long',
    'string.uri': 'This field must be a valid uri',
    'string.domain': 'This field must contain a valid domain name',
    'boolean.base': 'This field must be a boolean',
    'number.base': 'This field must be a number',
    'number.integer': 'This field must be an integer',
    'number.min': 'This field must be greater than or equal to {{#limit}}',
    'number.max': 'This field must be less than or equal to {{#limit}}',
    'number.positive': 'This field must be a positive number',
    'number.negative': 'This field must be a negative number',
    'date.base': 'This field must be a valid date',
    'date.format':
      'This field must be in {msg("date.format." + #format) || #format} format',
    'date.greater': 'This field must be greater than {{:#limit}}',
    'date.less': 'This field must be less than {{:#limit}}',
    'date.max': 'This field must be less than or equal to {{:#limit}}',
    'date.min': 'This field must be greater than or equal to {{:#limit}}',
    'array.base': 'This field must be an array',
    'object.base': 'This field must be of type {{#type}}',
    'object.unknown': '{{#label}} is not allowed',
    // 'string.base64': '{{#label}} must be a valid base64 string',
    // 'string.creditCard': '{{#label}} must be a credit card',
    // 'string.dataUri': '{{#label}} must be a valid dataUri string',
    // 'string.guid': '{{#label}} must be a valid GUID',
    // 'string.hex': '{{#label}} must only contain hexadecimal characters',
    // 'string.hexAlign': '{{#label}} hex decoded representation must be byte aligned',
    // 'string.hostname': '{{#label}} must be a valid hostname',
    // 'string.ip': '{{#label}} must be a valid ip address with a {{#cidr}} CIDR',
    // 'string.ipVersion': '{{#label}} must be a valid ip address of one of the following versions {{#version}} with a {{#cidr}} CIDR',
    // 'string.isoDate': '{{#label}} must be in iso format',
    // 'string.isoDuration': '{{#label}} must be a valid ISO 8601 duration',
    // 'string.lowercase': '{{#label}} must only contain lowercase characters',
    // 'string.normalize': '{{#label}} must be unicode normalized in the {{#form}} form',
    // 'string.token': '{{#label}} must only contain alpha-numeric and underscore characters',
    // 'string.pattern.base': '{{#label}} with value {:[.]} fails to match the required pattern: {{#regex}}',
    // 'string.pattern.name': '{{#label}} with value {:[.]} fails to match the {{#name}} pattern',
    // 'string.pattern.invert.base': '{{#label}} with value {:[.]} matches the inverted pattern: {{#regex}}',
    // 'string.pattern.invert.name': '{{#label}} with value {:[.]} matches the inverted {{#name}} pattern',
    // 'string.trim': '{{#label}} must not have leading or trailing whitespace',
    // 'string.uriCustomScheme': '{{#label}} must be a valid uri with a scheme matching the {{#scheme}} pattern',
    // 'string.uriRelativeOnly': '{{#label}} must be a valid relative uri',
    // 'string.uppercase': '{{#label}} must only contain uppercase characters',
    // 'number.greater': '{{#label}} must be greater than {{#limit}}',
    // 'number.infinity': '{{#label}} cannot be infinity',
    // 'number.less': '{{#label}} must be less than {{#limit}}',
    // 'number.multiple': '{{#label}} must be a multiple of {{#multiple}}',
    // 'number.negative': '{{#label}} must be a negative number',
    // 'number.port': '{{#label}} must be a valid port',
    // 'number.precision': '{{#label}} must have no more than {{#limit}} decimal places',
    // 'number.unsafe': '{{#label}} must be a safe number',
    // 'array.excludes': '{{#label}} contains an excluded value',
    // 'array.hasKnown': '{{#label}} does not contain at least one required match for type {:#patternLabel}',
    // 'array.hasUnknown': '{{#label}} does not contain at least one required match',
    // 'array.includes': '{{#label}} does not match any of the allowed types',
    // 'array.includesRequiredBoth': '{{#label}} does not contain {{#knownMisses}} and {{#unknownMisses}} other required value(s)',
    // 'array.includesRequiredKnowns': '{{#label}} does not contain {{#knownMisses}}',
    // 'array.includesRequiredUnknowns': '{{#label}} does not contain {{#unknownMisses}} required value(s)',
    // 'array.length': '{{#label}} must contain {{#limit}} items',
    // 'array.max': '{{#label}} must contain less than or equal to {{#limit}} items',
    // 'array.min': '{{#label}} must contain at least {{#limit}} items',
    // 'array.orderedLength': '{{#label}} must contain at most {{#limit}} items',
    // 'array.sort': '{{#label}} must be sorted in {#order} order by {{#by}}',
    // 'array.sort.mismatching': '{{#label}} cannot be sorted due to mismatching types',
    // 'array.sort.unsupported': '{{#label}} cannot be sorted due to unsupported type {#type}',
    // 'array.sparse': '{{#label}} must not be a sparse array item',
    // 'array.unique': '{{#label}} contains a duplicate value'
    // 'object.and': '{{#label}} contains {{#presentWithLabels}} without its required peers {{#missingWithLabels}}',
    // 'object.assert': '{{#label}} is invalid because {if(#subject.key, `"` + #subject.key + `" failed to ` + (#message || "pass the assertion test"), #message || "the assertion failed")}',
    // 'object.base': '{{#label}} must be of type {{#type}}',
    // 'object.instance': '{{#label}} must be an instance of {{:#type}}',
    // 'object.length': '{{#label}} must have {{#limit}} key{if(#limit == 1, "", "s")}',
    // 'object.max': '{{#label}} must have less than or equal to {{#limit}} key{if(#limit == 1, "", "s")}',
    // 'object.min': '{{#label}} must have at least {{#limit}} key{if(#limit == 1, "", "s")}',
    // 'object.missing': '{{#label}} must contain at least one of {{#peersWithLabels}}',
    // 'object.nand': '{{:#mainWithLabel}} must not exist simultaneously with {{#peersWithLabels}}',
    // 'object.oxor': '{{#label}} contains a conflict between optional exclusive peers {{#peersWithLabels}}',
    // 'object.pattern.match': '{{#label}} keys failed to match pattern requirements',
    // 'object.refType': '{{#label}} must be a Joi reference',
    // 'object.regex': '{{#label}} must be a RegExp object',
    // 'object.rename.multiple': '{{#label}} cannot rename {{:#from}} because multiple renames are disabled and another key was already renamed to {{:#to}}',
    // 'object.rename.override': '{{#label}} cannot rename {{:#from}} because override is disabled and target {{:#to}} exists',
    // 'object.schema': '{{#label}} must be a Joi schema of {{#type}} type',
    // 'object.with': '{{:#mainWithLabel}} missing required peer {{:#peerWithLabel}}',
    // 'object.without': '{{:#mainWithLabel}} conflict with forbidden peer {{:#peerWithLabel}}',
    // 'object.xor': '{{#label}} contains a conflict between exclusive peers {{#peersWithLabels}}',
  });
});
