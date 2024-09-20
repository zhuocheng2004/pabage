
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_variable_definition from '../src/passes/variable_definition.js';
import pass_function_definition from '../src/passes/function_definition.js';
import pass_export from '../src/passes/export.js';
import operators from '../src/operators.js';


test('variable', () => {
	const samples = [
		{
			text:	'export val x; export var y',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						export:	true,
					}),
					expect.objectContaining({ type: ASTNodeType.DELIMIT }),
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						export:	true,
					}),
				]
			})
		},
		{
			text:	'export val x = a + sin(pi); export var y = x * x',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						export:	true,
					}),
					expect.objectContaining({ type: ASTNodeType.DELIMIT }),
					expect.objectContaining({
						type:	NodeType.VAR_DEF,
						export:	true,
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, [ pass_variable_definition, pass_export ]);
		expect(ast).toEqual(sample.ast);
	}
});

test('function', () => {
	const samples = [
		{
			text:	'export fn f() { return 0; }; export fn add(a, b) { return a + b; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						export:	true,
					}),
					expect.objectContaining({ type: ASTNodeType.DELIMIT }),
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						export:	true,
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const ast = parse(tokenize(sample.text), operators);
		transform(ast, [ pass_function_definition, pass_export ]);
		expect(ast).toEqual(sample.ast);
	}
});
