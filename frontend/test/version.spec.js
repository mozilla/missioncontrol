import semVerCompare from '../version';

describe('semVerCompare Function', () => {
    it('Returns 1 when length of ver1 is greater than length of ver2', () => {
        const ver1 = '62.0.3';
        const ver2 = '62.0';
        const diff = semVerCompare(ver1, ver2);

        expect(diff).toEqual(1);
    });

    it('Returns -1 when length of ver1 is less than length of ver2', () => {
        const ver1 = '62.0';
        const ver2 = '62.0.3';
        const diff = semVerCompare(ver1, ver2);

        expect(diff).toEqual(-1);
    });

    it('Returns 1 when ver1DisplayPart is greater than ver2DisplayPart', () => {
        const ver1 = '60.0.1rc5';
        const ver2 = '59.0.2b55';
        const diff = semVerCompare(ver1, ver2);

        expect(diff).toEqual(1);
    });

    it('Returns -1 when ver1DisplayPart is less than ver2DisplayPart', () => {
        const ver1 = '59.0.2b55';
        const ver2 = '60.0.1rc5';
        const diff = semVerCompare(ver1, ver2);

        expect(diff).toEqual(-1);
    });

    it('Returns diff when the version display part is lexographically less, but numerically greater', () => {
        const ver1 = '64.0b10';
        const ver2 = '64.0b4';
        const diff = semVerCompare(ver1, ver2);

        expect(diff).toBeGreaterThan(0);
    });
});
