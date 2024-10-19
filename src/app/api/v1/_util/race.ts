type RaceGeneratorItem<T> = IteratorResult<T> & {
    generator: AsyncGenerator<T>;
    promise: Promise<RaceGeneratorItem<T>>;
};

export async function* race<T>(...generators: AsyncGenerator<T>[]) {
    const next = (generator: AsyncGenerator<T>) => {
        const promise: Promise<RaceGeneratorItem<T>> = generator
            .next()
            .then(({ done, value }) => ({ done, value, generator, promise }));
        return promise;
    };

    const promises = generators.reduce<Set<Promise<RaceGeneratorItem<T>>>>(
        (set, gen) => set.add(next(gen)),
        new Set(),
    );

    while (promises.size > 0) {
        const { done, value, generator, promise } = await Promise.race(promises);
        promises.delete(promise);

        if (!done) {
            promises.add(next(generator));
            yield value;
        }
    }
}
