
import path from 'node:path';
import fs from 'node:fs/promises';
import { tokenize, parse, operators, transform, standard_passes } from '@pabage/parser';
import { ObjectType, Frame, Context } from '../src/context.js';
import { setupRuntime, func_call } from '../src/runtime.js';


function mapPromiseResult(promise, func) {
	return new Promise((resolve, reject) => {
		promise.then(x => resolve(func(x))).catch(reject);
	});
}

function parsePaths(paths_str) {
	let paths = paths_str.split(':');
	paths = paths.filter(s => s);
	paths = [...new Set(paths)];	// remove duplicate elements
	return paths;
}

function printErrorContext(source, pos) {
	let s = '';
	for (let i = 0; i < col; i++) {
		const ch = source[lineStart + i];
		if (ch === '\t' || ch === '\r' || ch === '\n' || ch === '\b') {
			s += ch;
		} else {
			s += ' ';
		}
	}
	s += '^';

	const newLinePos = source.indexOf('\n', lineStart);
	console.error(source.substring(lineStart, newLinePos >= 0 ? newLinePos : source.length));
	console.error(s);
}

async function main(args) {
	const pbgs_paths = [];
	const js_paths = [];
	let entry;
	let args_passed = [];

	for (let i = 2; i < args.length; ) {
		const arg = args[i];
		if (arg === '-p') {
			if (i === args.length - 1) {
				console.error('no paths');
				return 1;
			}
			const paths = parsePaths(args[i+1]);
			if (paths === undefined) {
				console.error('invalid paths');
				return 1;
			}
			pbgs_paths.push(...(paths.map(p => path.resolve(p))));
			i += 2;
		} else if (arg === '-js') {
			if (i === args.length - 1) {
				console.error('no paths');
				return 1;
			}
			const paths = parsePaths(args[i+1]);
			if (paths === undefined) {
				console.error('invalid paths');
				return 1;
			}
			js_paths.push(...(paths.map(p => path.resolve(p))));
			i += 2;
		} else {
			if (entry === undefined) {
				entry = arg;
			} else {
				args_passed.push(arg);
			}
			i++;
		}
	}

	if (!entry) {
		console.error('no entry');
		return 1;
	}
	const entry_path = entry.split('.');
	if (entry_path.length === 0) {
		console.error('empty entry');
		return 1;
	}
	const entry_name = entry_path[entry_path.length-1];
	entry_path.pop();

	// read sources from files

	let sources;
	try {
		sources = await Promise.all(pbgs_paths.map(p => mapPromiseResult(fs.readFile(p, { encoding: 'utf8' }), text => new Object({
			path:	p,
			text:	text
		}))));
	} catch (err) {
		console.log(err);
		return 1;
	}

	const tokenInfos = {};

	// parse
	const asts = [];
	for (const source of sources) {
		try {
			const tokens = tokenize(source.text, source.path);
		} catch (e) {
			console.error(`Tokenize Error in ${e.path} @ Line ${e.line+1}, Col ${e.col+1}: ${e.message}`);
			printErrorContext(source.text, e.pos);
			return 1;
		}

		const parseResult = parse(tokens, operators);
		if (parseResult.err) {
			const tokenPos = parseResult.pos;
			const token = tokens[tokenPos];
			console.error(`Syntax Error in ${source.path} @ Line ${token.line+1}, Col ${token.col+1}: ${parseResult.err}`);
			printErrorContext(source.text, tokenizeResult.lineStarts[token.line], token.col);
			return 1;
		}

		const ast = parseResult.ast;
		const err = transform(ast, standard_passes);
		if (err) {
			const token = err.token;
			console.error(`Syntax Error in ${source.path} @ Line ${token.line+1}, Col ${token.col+1}: ${err.msg}`);
			printErrorContext(source.text, tokenizeResult.lineStarts[token.line], token.col);
			return 1;
		}

		tokenInfos[p] = {
			text:	source.text,
			lineStarts:	tokenizeResult.lineStarts
		};

		asts.push(ast);
	}

	function printError(err, msg_head = 'Error') {
		const token = err.token;
		if (token) {
			console.error(`${msg_head} in ${token.path} @ Line ${token.line+1}, Col ${token.col+1}: ${err.msg}`);
			if (tokenInfos[token.path]) {
				const tokenInfo = tokenInfos[token.path];
				printErrorContext(tokenInfo.text,tokenInfo.lineStarts[token.line], token.col);
			}
		} else {
			console.error(`${msg_head}: ${err.msg}`);
		}
	}

	const context = new Context();
	let err = context.setup(asts);
	if (err) {
		printError(err, 'Runtime Setup Error');
		return 1;
	}

	// load init js modules
	const js_modules = [];
	for (const js_path of js_paths) {
		js_modules.push(await import(js_path));
	}

	// do native init
	for (let i = 0; i < js_paths.length; i++) {
		const js_module = js_modules[i];
		if (js_module.init) {
			err = js_module.init(context);
			if (err) {
				console.error(`Error initializing module '${js_module.info ? js_module.info.name : '<unknown>'}' (${js_paths[i]}): ${err.msg}`);
				return 1;
			}
		}
	}

	let result = context.findObjAtPath(context.global, entry_name, entry_path);
	if (result.err) {
		console.error(`Error finding entry: ${result.err.msg}`);
		return 1;
	}
	const def = result.value;
	result = def.get();
	if (result.err) {
		console.error(`Error getting entry: ${result.err.msg}`);
		return 1;
	}

	const entry_func = result.value;
	if (entry_func.type !== ObjectType.FUNC) {
		console.error(`${entry} is not a function`);
		return 1;
	}

	err = setupRuntime(context);
	if (err) {
		printError(err, 'Runtime Init Error');
		return 1;
	}

	context.stack = [ new Frame(entry_func.def_node) ];
	result = func_call(context, entry_func, []);
	if (result.err) {
		printError(result.err, 'Runtime Error');
		return 1;
	}

	// do native exit
	for (const js_module of js_modules) {
		if (js_module.exit) {
			err = js_module.exit(context);
			if (err) {
				console.error(`Error exiting module ${js_module}: ${err.msg}`);
				return 1;
			}
		}
	}

	return 0;
}

const ret = await main(process.argv);
process.exit(ret);
