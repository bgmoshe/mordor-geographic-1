var containsFieldAsNumber = function containsFieldAsNumber(input, field){
    return field in input && !(isNaN(input[field]));
}
module.exports.containsFieldAsNumber = containsFieldAsNumber;