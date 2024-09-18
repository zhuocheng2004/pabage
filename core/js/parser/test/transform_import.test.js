
import { tokenize } from '../src/tokenizer.js';
import { ASTNodeType, parse } from '../src/parser.js';
import { NodeType, transform } from '../src/transformer.js';
import pass_function_definition from '../src/passes/function_definition.js';
import pass_import from '../src/passes/import.js';
import operators from '../src/operators.js';


test('global', () => {
	const samples = [
		{
			text:	'import java.lang.Object;',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.STAT_IMPORT,
						path:	[ 'java', 'lang' ],
						name:	'Object'
					}),
					expect.objectContaining({ type: ASTNodeType.DELIMIT }),
				]
			})
		},
	];

	for (const sample of samples) {
		const parseResult = parse(tokenize(sample.text), operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_import ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});

test('local', () => {
	const samples = [
		{
			text:	'fn main() { import java.lang.String; }',
			ast:	expect.objectContaining({
				type:	ASTNodeType.ROOT,
				nodes:	[
					expect.objectContaining({
						type:	NodeType.FUNC_DEF,
						args:	[],
						name:	'main',
						body:	expect.objectContaining({
							type:	ASTNodeType.OP_GROUP,
							nodes:	[
								expect.objectContaining({
									type:	NodeType.STAT_IMPORT,
									path:	[ 'java', 'lang' ],
									name:	'String'
								}),
							]
						})
					}),
				]
			})
		},
	];

	for (const sample of samples) {
		const parseResult = parse(tokenize(sample.text), operators);
		expect(parseResult.err).toBeUndefined();

		const ast = parseResult.ast;
		const err = transform(ast, [ pass_function_definition, pass_import ]);
		expect(err).toBeUndefined();
		expect(ast).toEqual(sample.ast);
	}
});
