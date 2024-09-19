
import operators from "../src/operators.js";
import { parse } from "../src/parser.js";
import { tokenize } from "../src/tokenizer.js";


function main(text) {
    let tokens;
    try {
        tokens = tokenize(text);
    } catch (e) {
        console.error(`Tokenize Error in ${e.path} @ pos ${e.pos}: ${e.message}`);
        return 1;
    }

    let ast;
    try {
        ast = parse(tokens, operators);
    } catch (e) {
        console.error(`Parse Error @ token[${e.pos}]: ${e.message}`);
        return 1;
    }

    console.log(ast);
}

if (process.argv.length > 2) {
    main(process.argv[2]);
}