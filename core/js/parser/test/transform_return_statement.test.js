
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_return_statement from '../src/passes/return_statement.js';
import operators from '../src/operators.js';


test('simple', () => {
	const samples = [
		{
			text:	'fn main() { return; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({}),
					expect.objectContaining({
						node2:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_RETURN
								})
							]
						})
					}),
				]
			})
		},
		{
			text:	'fn add(x, y) { return x + y; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({}),
					expect.objectContaining({
						node2:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_RETURN,
									arg:	expect.objectContaining({
										type:	ASTNodeType.OP_BINARY
									})
								})
							]
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, [ pass_return_statement ]);
		expect(ast).toEqual(sample.ast);
	}
});
