export type DemoUser = { name: string; email: string };

const pause = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function signInForDemo(): Promise<DemoUser> {
  await pause(650);
  return { name: "Nanret John", email: "nanret@lendsqr.com" };
}

export async function connectGmailForDemo(): Promise<void> {
  await pause(900);
}
