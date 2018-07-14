/**
   @param {Object} input - A dictionary.
   @param {string} field - A field.
   @returns {float}
   @description This function checks whether input.field exists and if it is a number.
   If it is, the function return true.
*/
function containsFieldAsNumber(input, field){
    return field in input && !(isNaN(input[field]));
}

module.exports.containsFieldAsNumber = containsFieldAsNumber;
