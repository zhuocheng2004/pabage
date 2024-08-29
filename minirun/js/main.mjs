
import { TokenType, tokenize } from "./tokenizer.mjs";
import { parse } from "./parser.mjs";
import { run } from "./runner.mjs";

const operators = [
	{
		enclose:	[ [ TokenType.LPAREN, TokenType.RPAREN ] ],
		unary:		[ TokenType.PLUS, TokenType.MINUS ],
	},
	{
		binary:		[ TokenType.STAR, TokenType.SLASH ],
	},
	{
		binary:		[ TokenType.PLUS, TokenType.MINUS ],
	}
];

function evaluate(source) {
	const tokenzieResult = tokenize(source);
	
	if (tokenzieResult.err) {
		console.log(`Failed to tokenize: ${tokenzieResult.err} @ Line ${tokenzieResult.line}, Col ${tokenzieResult.col}`);
		return;
	}

	const tokens = tokenzieResult.tokens;
	
	const parseResult = parse(tokens, operators);

	if (parseResult.err) {
		const tokenPos = parseResult.pos;
		const token = tokens[tokenPos];
		console.log(`Failed to parse: ${parseResult.err} @ Line ${token.line}, Col ${token.col}`);
		return;
	}

	const ast = parseResult.ast;
	
	run(ast);
}

if (process.argv.length >= 3)
	evaluate(process.argv[2])
