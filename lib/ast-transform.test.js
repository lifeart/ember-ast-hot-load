'use strict';

/* eslint-env jest */
const defaultConfig = {
    addonContext: {
        _OPTIONS: {
            enabled: true,
            initialized: true,
            salt: 'upslsp6ldfm',
            helpers: ['some-component-to-ignore']
        }
    }
};
const glimmer = require('@glimmer/syntax');
const ASTHotLoadTransformPlugin = require('./ast-transform')(defaultConfig);

it('skip monoworded helpers', () => {
    assert(
        `{{foo}}`, `{{foo}}`
    );
});
it('handle hyphen helpers and components', () => {
    assert(
        `{{foo-bar}}`, `{{component (hot-load "foo-bar" this foo-bar "foo-bar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar" hotReloadCUSTOMhlProperty=foo-bar hotReloadCUSTOMHasParams=false hotReloadCUSTOMHasHash=false}}`
    );
    assert(
        `{{foo-bar-baz}}`, `{{component (hot-load "foo-bar-baz" this foo-bar-baz "foo-bar-baz") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar-baz" hotReloadCUSTOMhlProperty=foo-bar-baz hotReloadCUSTOMHasParams=false hotReloadCUSTOMHasHash=false}}`
    );
});
it('handle components with positional params', () => {
    assert(
        `{{foo-bar a 1 (hello 12)}}`,  `{{component (hot-load "foo-bar" this foo-bar "foo-bar") a 1 (hello 12) hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar" hotReloadCUSTOMhlProperty=foo-bar hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false}}`
    );
});
it('handle components with hashed params', () => {
    assert(
        `{{foo-bar a=b b=1 c=(hello 12)}}`,  `{{component (hot-load "foo-bar" this foo-bar "foo-bar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar" hotReloadCUSTOMhlProperty=foo-bar hotReloadCUSTOMHasParams=false hotReloadCUSTOMHasHash=true a=b b=1 c=(hello 12)}}`
    );
});
it('handle component helper', () => {
    assert(
        `{{component "foo"}}`,  `{{component (hot-load "foo" this "foo" "foo") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo" hotReloadCUSTOMhlProperty="foo" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false}}`
    );
    assert(
        `{{component (concat 'a' 'b')}}`, `{{component (hot-load (concat "a" "b") this (concat "a" "b") "[object Object]") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="[object Object]" hotReloadCUSTOMhlProperty=(concat "a" "b") hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false}}`
    );
});
it('handle components as props', () => {
    assert(
        `{{foo-bar item=(component "boo-baz")}}`, `{{component (hot-load "foo-bar" this foo-bar "foo-bar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar" hotReloadCUSTOMhlProperty=foo-bar hotReloadCUSTOMHasParams=false hotReloadCUSTOMHasHash=true item=(component (hot-load "boo-baz" this "boo-baz" "boo-baz") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="boo-baz" hotReloadCUSTOMhlProperty="boo-baz" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false)}}`
    )
});
it('handle complex blocked components', () => {
    assert(
        `{{#foo-bar 12 item=(component "boo-baz")}}11{{/foo-bar}}`, `{{#component (hot-load "foo-bar" this foo-bar "foo-bar") 12 hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar" hotReloadCUSTOMhlProperty=foo-bar hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=true item=(component (hot-load "boo-baz" this "boo-baz" "boo-baz") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="boo-baz" hotReloadCUSTOMhlProperty="boo-baz" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false)}}11{{/component}}`
    )
});
it('can ignore some components', () => {
    assert(
        `{{some-component-to-ignore}}`, `{{some-component-to-ignore}}`
    )
});
it('handle angleBracket components', () => {
    assert(
        `<FooBar />`, `{{#let (component (hot-load "FooBar" this "FooBar" "FooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="FooBar" hotReloadCUSTOMhlProperty="FooBar" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadFooBarupslsp6ldfm|}}<HotLoadFooBarupslsp6ldfm />{{/let}}`
    )
});
it('handle blocked angleBracket components', () => {
    assert(
        `<FooBar>1</FooBar>`, `{{#let (component (hot-load "FooBar" this "FooBar" "FooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="FooBar" hotReloadCUSTOMhlProperty="FooBar" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadFooBarupslsp6ldfm|}}<HotLoadFooBarupslsp6ldfm>1</HotLoadFooBarupslsp6ldfm>{{/let}}`
    )
});
it('handle nested angleBracket components', () => {
    assert(
        `<FooBar><FooBaz/></FooBar>`, `{{#let (component (hot-load "FooBar" this "FooBar" "FooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="FooBar" hotReloadCUSTOMhlProperty="FooBar" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadFooBarupslsp6ldfm|}}<HotLoadFooBarupslsp6ldfm>{{#let (component (hot-load "FooBaz" this "FooBaz" "FooBaz") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="FooBaz" hotReloadCUSTOMhlProperty="FooBaz" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadFooBazupslsp6ldfm|}}<HotLoadFooBazupslsp6ldfm />{{/let}}</HotLoadFooBarupslsp6ldfm>{{/let}}`
    )
});
it('handle complex contexted angleBracket components', () => {
    assert(
        `<FooBar />
        <Baz as |ctx|>
          <ctx.boo />
        </Baz>
        <Boo as |Foo|>
            <Foo />
        </Boo>`,
        `{{#let (component (hot-load "FooBar" this "FooBar" "FooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="FooBar" hotReloadCUSTOMhlProperty="FooBar" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadFooBarupslsp6ldfm|}}<HotLoadFooBarupslsp6ldfm />{{/let}}
        {{#let (component (hot-load "Baz" this "Baz" "Baz") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="Baz" hotReloadCUSTOMhlProperty="Baz" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadBazupslsp6ldfm|}}<HotLoadBazupslsp6ldfm as |ctx|>
          <ctx.boo />
        </HotLoadBazupslsp6ldfm>{{/let}}
        {{#let (component (hot-load "Boo" this "Boo" "Boo") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="Boo" hotReloadCUSTOMhlProperty="Boo" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadBooupslsp6ldfm|}}<HotLoadBooupslsp6ldfm as |Foo|>
            <Foo />
        </HotLoadBooupslsp6ldfm>{{/let}}`
    )
});
it('can handle mixed contexted components', () => {
    assert(`{{#let (component 'foobar') as |FooBar|}}
    <FooBar />
  {{/let}}
  {{#let (component 'baz') as |Baz|}}
    <Baz as |ctx|>
      <ctx.boo />
    </Baz>
  {{/let}}
  {{#let (component 'boo') as |boo|}}
    <Boo as |Foo|>
        <Foo />
    </Boo>
  {{/let}}`,
  `{{#let (component (hot-load "foobar" this "foobar" "foobar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foobar" hotReloadCUSTOMhlProperty="foobar" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |FooBar|}}    <FooBar />
  {{/let}}{{#let (component (hot-load "baz" this "baz" "baz") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="baz" hotReloadCUSTOMhlProperty="baz" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |Baz|}}    <Baz as |ctx|>
        <ctx.boo />
      </Baz>
  {{/let}}{{#let (component (hot-load "boo" this "boo" "boo") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="boo" hotReloadCUSTOMhlProperty="boo" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |boo|}}    {{#let (component (hot-load "Boo" this "Boo" "Boo") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="Boo" hotReloadCUSTOMhlProperty="Boo" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false) as |HotLoadBooupslsp6ldfm|}}<HotLoadBooupslsp6ldfm as |Foo|>
          <Foo />
      </HotLoadBooupslsp6ldfm>{{/let}}
  {{/let}}`);
});

it('correctly handle some cases', ()=>{
    assert(`{{component 'foo-bar' a="1"}}
    {{component (mut 1 2 3) b c d e="f"}}
    {{foo-bar
      baz="stuff"
    }}
    {{#foo-boo}}
    dsfsd
    {{/foo-boo}}
    {{doo-bar 1 2 3 hoo-boo name=(goo-boo "foo")}}
    {{test-component}}
    {{component @fooBar}}
    {{component this.fooBar}}
    {{component fooBar}}
    {{component args.fooBar}}`, `{{component (hot-load "foo-bar" this "foo-bar" "foo-bar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar" hotReloadCUSTOMhlProperty="foo-bar" hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=true a="1"}}
    {{component (hot-load (mut 1 2 3) this (mut 1 2 3) "[object Object]") b c d hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="[object Object]" hotReloadCUSTOMhlProperty=(mut 1 2 3) hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=true e="f"}}
    {{component (hot-load "foo-bar" this foo-bar "foo-bar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-bar" hotReloadCUSTOMhlProperty=foo-bar hotReloadCUSTOMHasParams=false hotReloadCUSTOMHasHash=true baz="stuff"}}
{{#component (hot-load "foo-boo" this foo-boo "foo-boo") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="foo-boo" hotReloadCUSTOMhlProperty=foo-boo hotReloadCUSTOMHasParams=false hotReloadCUSTOMHasHash=false}}    dsfsd
{{/component}}    {{component (hot-load "doo-bar" this doo-bar "doo-bar") 1 2 3 hoo-boo hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="doo-bar" hotReloadCUSTOMhlProperty=doo-bar hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=true name=(goo-boo "foo")}}
    {{component (hot-load "test-component" this test-component "test-component") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="test-component" hotReloadCUSTOMhlProperty=test-component hotReloadCUSTOMHasParams=false hotReloadCUSTOMHasHash=false}}
    {{component (hot-load @fooBar this @fooBar "@fooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="@fooBar" hotReloadCUSTOMhlProperty=@fooBar hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false}}
    {{component (hot-load this.fooBar this this.fooBar "this.fooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="this.fooBar" hotReloadCUSTOMhlProperty=this.fooBar hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false}}
    {{component (hot-load fooBar this fooBar "fooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="fooBar" hotReloadCUSTOMhlProperty=fooBar hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false}}
    {{component (hot-load args.fooBar this args.fooBar "args.fooBar") hotReloadCUSTOMhlContext=this hotReloadCUSTOMName="args.fooBar" hotReloadCUSTOMhlProperty=args.fooBar hotReloadCUSTOMHasParams=true hotReloadCUSTOMHasHash=false}}`);
});

it('ignore addon-specific helper special names', ()=>{
    assert(`{{hot-load}}`, `{{hot-load}}`);
    assert(`{{component "hot-load"}}`, `{{component "hot-load"}}`);
});

it('skip transform for already hot-load wrapped components', ()=>{
    assert(`{{component (hot-load "foo-bar")}}`, `{{component (hot-load "foo-bar")}}`);
    assert(`{{#component (hot-load "foo-bar")}}12{{/component}}`, `{{#component (hot-load "foo-bar")}}12{{/component}}`);
    assert(`{{component (hot-load "foo-bar") name=(component (hot-load "foo-bar"))}}`, `{{component (hot-load "foo-bar") name=(component (hot-load "foo-bar"))}}`);
});

it('skip ...attributed components', ()=>{
    assert(`<FooBar ...attributes />`, `<FooBar...attributes />`);
    assert(`<FooBar name="foo" ...attributes />`, `<FooBar name="foo"...attributes />`);

});

it('skip Input and Textarea components', ()=>{
    assert('<Input />','<Input />');
    assert('<Textarea />','<Textarea />');
});

it('skip tags with @ in name', ()=>{
    assert('<@FooBar/>','<@FooBar />');
});

it('skip tags with . in name', ()=>{
    assert('<Foo.Bar/>','<Foo.Bar />');
});

it('skip attribute bindings, looking like components', ()=>{
    assert('<div name={{foo-bar}} />', '<div name={{foo-bar}} />');
});

it('skip element-modifiers', ()=>{
    assert('<div {{foo-bar}} />', '<div {{foo-bar}} />');
    assert('<div {{foo-bar (concat "a" "foo-bar")}} />', '<div {{foo-bar (concat "a" "foo-bar")}} />');
});

it('skip concat statements', ()=>{
    assert('{{concat (mod-by foo bar)}}', '{{concat (mod-by foo bar)}}');
    assert('{{foo (mod-by foo bar)}}', '{{foo (mod-by foo bar)}}');
    assert('<div attr="test {{class-name}}" />', '<div attr="test {{class-name}}" />');
});

it('skip escaped raw blocks', ()=>{
    assert('{{{fooo}}}', '{{{fooo}}}');
    assert(`{{{'fooo'}}}`, `{{{"fooo"}}}`);
    assert(`{{{FooBar}}}`, '{{{FooBar}}}');
    assert(`{{{foo-bar}}}`, '{{{foo-bar}}}');
    assert(`{{{'foo-bar'}}}`, '{{{"foo-bar"}}}');
    assert(`{{{'FooBar'}}}`, `{{{"FooBar"}}}`);
    assert(`{{{'<div><FooBar></FooBar></div>'}}}`, "{{{\"<div><FooBar></FooBar></div>\"}}}");
});

it('call transformation if addon enabled and initialized', ()=>{
    const inst = new ASTHotLoadTransformPlugin();
    const syntax = {
        traverse() {
            this.called = true;
        }
    }
    inst.syntax = syntax;
    inst.transform({});
    expect(inst.syntax.called).toEqual(true);
});

it('exit from transformation if addon disabled', ()=>{
    const configForDisabledAddon = {
        addonContext: {
            _OPTIONS: {}
        }
    };
    Object.defineProperty(configForDisabledAddon.addonContext._OPTIONS, 'enabled', {
        get: function() { this.enabledCalled = true;  return false; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(configForDisabledAddon.addonContext._OPTIONS, 'initialized', {
        get: function() { this.initializedCalled = true;  return true; },
        enumerable: true,
        configurable: true
    });
    const DisabledASTHotLoadTransformPlugin = require('./ast-transform')(configForDisabledAddon);
    const inst = new DisabledASTHotLoadTransformPlugin();
    const syntax = {
        traverse() {
            this.called = true;
        }
    }
    inst.syntax = syntax;
    inst.transform({});
    expect(inst.syntax.called).toEqual(undefined);
    expect(configForDisabledAddon.addonContext._OPTIONS.enabledCalled).toEqual(true);
    expect(configForDisabledAddon.addonContext._OPTIONS.initializedCalled).toEqual(undefined);
});

it('exit from transformation if addon not initialized (blacklisted)', ()=>{
    const configForDisabledAddon = {
        addonContext: {
            _OPTIONS: {}
        }
    };
    Object.defineProperty(configForDisabledAddon.addonContext._OPTIONS, 'enabled', {
        get: function() { this.enabledCalled = true;  return true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(configForDisabledAddon.addonContext._OPTIONS, 'initialized', {
        get: function() { this.initializedCalled = true;  return false; },
        enumerable: true,
        configurable: true
    });
    const DisabledASTHotLoadTransformPlugin = require('./ast-transform')(configForDisabledAddon);
    const inst = new DisabledASTHotLoadTransformPlugin();
    const syntax = {
        traverse() {
            this.called = true;
        }
    }
    inst.syntax = syntax;
    inst.transform({});
    expect(inst.syntax.called).toEqual(undefined);
    expect(configForDisabledAddon.addonContext._OPTIONS.enabledCalled).toEqual(true);
    expect(configForDisabledAddon.addonContext._OPTIONS.initializedCalled).toEqual(true);
});

function normalizeResult(tpl) {
    //.replace(/ +(?= )/g,'')
    return tpl.toString().replace(/(\r\n\t|\n|\r\t)/gm, "").split(' ').join('');
}

function assert(template, expected) {
    let ast = process(template);  
    let printed = glimmer.print(ast);
    expect(normalizeResult(printed)).toEqual(normalizeResult(expected));
}
  
function process(template) {
    let plugin = () => {
        return ASTHotLoadTransformPlugin
            .createASTPlugin(defaultConfig.addonContext._OPTIONS, {builders: glimmer.builders});
    };
    return glimmer.preprocess(template, {
        plugins: {
            ast: [plugin]
        }
    });
}