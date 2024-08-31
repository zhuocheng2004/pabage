" Vim syntax file for pbgs file type

if exists("b:current_syntax")
	finish
endif

syn keyword	pbgsTodo	contained TODO FIXME XXX
syn keyword	pbgsDef		fn val var
syn keyword	pbgsCtrl	return

syn match	pbgsCommentLine	"\/\/.*" contains=pbgsTodo
syn region	pbgsComment	start="/\*" end="\*/" contains=pbgsTodo
syn region	pbgsStringD	start=+"+ skip=+\\\\\|\\"+ end=+"\|$+ 
syn region	pbgsStringS	start=+'+ skip=+\\\\\|\\'+ end=+'\|$+ 
syn match	pbgsNumber	"\d\+"


hi def link	pbgsTodo	Todo
hi def link	pbgsDef		Type
hi def link	pbgsCtrl	Conditional

hi def link	pbgsComment	Comment
hi def link	pbgsCommentLine	Comment
hi def link	pbgsStringD	String
hi def link	pbgsStringS	String
hi def link	pbgsNumber	Number
