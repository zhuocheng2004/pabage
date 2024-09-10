
import { tokenize } from '../src/tokenizer';
import { ASTNodeType, parse } from '../src/parser';
import { NodeType, transform } from '../src/transformer';
import pass_variable_definition from '../src/passes/variable_definition';
import pass_function_definition from '../src/passes/function_definition';
import pass_export from '../src/passes/export';
import operators from '../src/operators';


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
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_variable_definition, pass_export ]);
		expect(err).toBeUndefined();
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
		const tokenizeResult = tokenize(sample.text);
		expect(tokenizeResult.err).toBeUndefined();

		const parseResult = parse(tokenizeResult.tokens, operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_function_definition, pass_export ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
