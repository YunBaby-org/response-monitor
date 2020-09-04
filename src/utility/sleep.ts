export async function sleep(millisecond: number) {
  await new Promise(resolve => {
    setTimeout(resolve, millisecond);
  });
}
