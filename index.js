var claimed = [
  { claimed: false },
  { claimed: true },
  { claimed: false },
  { claimed: false },
  { claimed: true },
];
const claimedCount = claimed.filter(({ claimed }) => claimed);

// const claimedCount = claimed.reduce(
//   (accumulator, claim) => (claim.claimed ? accumulator + 1 : null),
//   0
// );
console.log(claimedCount.length);
