/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at
 * https://firebase.google.com/docs/functions
 */
const {removeManagerUidOnEndDate} = require(
    "./funct/removeManagerUidOnEndDate",
);

console.log(
    "Type of removeManagerUidOnEndDate:",
    typeof removeManagerUidOnEndDate,
);

exports.removeManagerUidOnEndDate = removeManagerUidOnEndDate;
