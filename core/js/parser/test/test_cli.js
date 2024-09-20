
import operators from "../src/operators.js";
import { parse } from "../src/parser.js";
import { tokenize } from "../src/tokenizer.js";
import { transform } from "../src/transformer.js";
import { standard_passes } from "../src/passes/passes.js";


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
        const token = tokens[e.pos];
        console.error(`Parse Error in ${token.path} @ ${token.pos}: ${e.message}`);
        return 1;
    }

    try {
        transform(ast, standard_passes);
    } catch (e) {
        if (e.token) {
            const token = e.token;
            console.error(`Syntax Error in ${token.path} @ pos ${token.pos}: ${e.message}`);
        } else {
            console.error(`Syntax Error: ${e.message}`)
        }
        return 1;
    }

    console.log('AST Nodes:');
    console.log(ast.nodes);
}

if (process.argv.length > 2) {
    main(process.argv[2]);
}