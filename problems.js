const codingProblems = [
    {
        task: "Write a function to reverse a string.",
        functionName: "reverseString",
        testCases: [
            { input: `"hello"`, expected: `"olleh"` },
            { input: `"world"`, expected: `"dlrow"` }
        ]
    },
    {
        task: "Write a function to find the factorial of a number.",
        functionName: "factorial",
        testCases: [
            { input: `5`, expected: `120` },
            { input: `3`, expected: `6` }
        ]
    },
    {
        task: "Write a function to check if a number is prime.",
        functionName: "isPrime",
        testCases: [
            { input: `7`, expected: `true` },
            { input: `4`, expected: `false` }
        ]
    },
    {
        task: "Write a function that returns the maximum of two numbers.",
        functionName: "maxNumber",
        testCases: [
            { input: `3, 7`, expected: `7` },
            { input: `10, 2`, expected: `10` }
        ]
    },
    {
        task: "Write a function to sum all elements in an array.",
        functionName: "sumArray",
        testCases: [
            { input: `[1, 2, 3, 4]`, expected: `10` },
            { input: `[5, 10, 15]`, expected: `30` }
        ]
    }
];

module.exports = codingProblems;
