
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_function_call from '../src/passes/function_call.js';
import operators from '../src/operators.js';


test('simple', () => {
	const samples = [
		{
			text:	'sin(123.456)',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_FUNC_CALL,
						func:	expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
						args:	[
							expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
						]
					}),
				]
			})
		},
        {
			text:	'sin(a - b)',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_FUNC_CALL,
						func:	expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
						args:	[
							expect.objectContaining({ type:	ASTNodeType.OP_BINARY }),
						]
					}),
				]
			})
		},
        {
			text:	'this.f("ABC", 2)',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_FUNC_CALL,
						func:	expect.objectContaining({ type:	ASTNodeType.OP_BINARY }),
						args:	[
							expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
							expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
						]
					}),
				]
			})
		},
        {
			text:	'(map(f))(list)',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.EXPR_FUNC_CALL,
						func:	expect.objectContaining({ type:	ASTNodeType.OP_GROUP }),
						args:	[
							expect.objectContaining({ type:	ASTNodeType.PRIMITIVE }),
						]
					}),
				]
			})
		},
	]

	for (const sample of samples) {
		const parseResult = parse(tokenize(sample.text), operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_function_call ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
