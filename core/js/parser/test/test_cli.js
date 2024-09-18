
import { tokenize } from "../src/tokenizer.js";


function main(text) {
    try {
        const tokens = tokenize(text);
        console.log(tokens);
    } catch (e) {
        console.error(`Tokenize Error in ${e.path} @ pos ${e.pos}: ${e.message}`);
        return 1;
    }
}

if (process.argv.length > 2) {
    main(process.argv[2]);
}