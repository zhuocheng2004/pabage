
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_chunk from '../src/passes/chunk.js';
import operators from '../src/operators.js';


test('simple', () => {
	const samples = [
		{
			text:	'fn main() { print("ABC"); exit(0); }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({}),
					expect.objectContaining({
						node2:	expect.objectContaining({
							type:	NodeType.CHUNK,
							nodes:	[
								expect.objectContaining({}),
								expect.objectContaining({}),
							]
						})
					}),
				]
			})
		},
		{
			text:	'if (a == 0) { b = cos(c); } else { b = sin(c); }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						node2:	expect.objectContaining({
							type:	NodeType.CHUNK,
							nodes:	[ 
								expect.objectContaining({}),
							]
						})
					}),
					expect.objectContaining({
						node2:	expect.objectContaining({
							type:	NodeType.CHUNK,
							nodes:	[ 
								expect.objectContaining({}),
							]
						})
					}),
				]
			})
		},
	]

	for (const sample of samples) {
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_chunk ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
