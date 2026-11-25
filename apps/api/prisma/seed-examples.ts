export type ExampleSeed = {
  email: string;
  name: string;
};

export type ExampleSeedClient = {
  example: {
    upsert(args: {
      where: { email: string };
      create: ExampleSeed;
      update: { name: string };
    }): Promise<unknown>;
  };
};

export async function seedExamples(
  database: ExampleSeedClient,
): Promise<number> {
  const examples = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    return {
      email: `example-${number}@example.test`,
      name: `Example ${number}`,
    };
  });

  for (const example of examples) {
    await database.example.upsert({
      where: { email: example.email },
      create: example,
      update: { name: example.name },
    });
  }

  return examples.length;
}
