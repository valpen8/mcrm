/**
 * I removeManagerUidOnEndDate.js - tar bort managerUid på användare
 */

const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Returnerar dagens datum i formatet "YYYY-MM-DD" för den angivna
 * tidszonen.
 *
 * @param {string} timeZone - Tidszonsidentifierare (t.ex. "Europe/Stockholm").
 * @return {string} Dagens datum formaterat som "YYYY-MM-DD".
 */
function getTodayFormatted(timeZone) {
  const date = new Date();
  // Konvertera datumet till den önskade tidszonen
  const dateInTimezone = new Date(
      date.toLocaleString("en-US", {timeZone}),
  );
  const year = dateInTimezone.getFullYear();
  const month = (dateInTimezone.getMonth() + 1)
      .toString()
      .padStart(2, "0");
  const day = dateInTimezone.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Schemalagd funktion som körs varje dag vid 00:00 (Europe/Stockholm).
 * Tar bort fältet managerUid från användare vars sistaArbetsdag är dagens
 * datum i formatet "YYYY-MM-DD".
 */
exports.removeManagerUidOnEndDate = onSchedule(
    "every minute",
    {timeZone: "Europe/Stockholm"},
    async (context) => {
      const today = getTodayFormatted("Europe/Stockholm");
      console.log(
          "Funktionen körs, dagens datum (Europe/Stockholm):",
          today,
      );

      const usersRef = admin.firestore().collection("users");
      const snapshot = await usersRef
          .where("sistaArbetsdag", "==", today)
          .get();

      snapshot.forEach((doc) => {
        console.log(`Uppdaterar dokument: ${doc.id}`);
        doc.ref.update({
          managerUid: admin.firestore.FieldValue.delete(),
        });
      });

      return null;
    },
);
