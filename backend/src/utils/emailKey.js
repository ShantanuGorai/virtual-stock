// One real inbox can have many spellings at Gmail:
//   s.han@gmail.com, shan+deal@gmail.com and shan@googlemail.com all reach shan@gmail.com.
// canonicalEmail() maps them to one key so a single Gmail inbox can only own one account.
function canonicalEmail(email) {
  const [local, domain] = String(email).trim().toLowerCase().split("@");
  if (!local || !domain) return String(email).trim().toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return `${local}@${domain}`;
}

module.exports = { canonicalEmail };
