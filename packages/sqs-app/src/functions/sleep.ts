export const sleep = (msTimeout: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, msTimeout));
};
