/**
 * Linen — a warm neutral theme for the DeepSeek Harness Web GUI.
 *
 * The theme is a token override layer (`ctx.theme.overrideTokens`), not a
 * registered theme: the user keeps choosing light, dark, or system in
 * Appearance, and every token below carries both palettes so either choice
 * stays legible.
 *
 * Deliberately out of scope, each blocked by the mechanism rather than taste:
 * - Font sizes and line heights: the presenter rewrites `--dsh-content-font-size`
 *   and the type ladder from Settings on every apply, so an override here would
 *   leave the font-size stepper in Settings doing nothing.
 * - Elevation and shadow tokens: declared on `body, body *`, so a body-level
 *   override never reaches the elements that consume them.
 * - Menu material: `--dsw-menu-surface-fill` and `--dsw-menu-backdrop-filter`
 *   are theme-owned, and the ui-theme specs reject redefinitions.
 * - Product icons: `ThemeDefinition.icons` exists only on `ctx.theme.register`,
 *   and registering would replace the user's light/dark preference.
 *
 * Brand and semantic state colors keep their product values: a theme that
 * recolors success, error, or link stops communicating state.
 */

window.__ModuleLoader__.load({
  id: 'dsh-theme-linen',
  factory(require) {
    const React = require('react')
    const { Input, Switch } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement

    /** Settings namespace: the Host entry id, whose `Config` owns these fields. */
    const NAMESPACE = 'theme-linen'

    /** Locale namespace owned by this plugin. */
    const LOCALE = 'theme.linen'

    /** Values a not-yet-loaded namespace falls back to; mirrors the Host schema. */
    const DEFAULTS = Object.freeze({
      enabled: true,
      palette: 'warm',
      radius: 'standard',
      textFont: '',
      codeFont: '',
      strongWeight: 500,
    })

    /** Repeat one value for both palettes; only scheme-independent tokens use it. */
    const same = (value) => ({ light: value, dark: value })

    /**
     * Warm surface, border, text, and control colors. Tokens the sheet derives
     * with `var()` follow these automatically, so only literal leaves appear.
     */
    const WARM_COLORS = {
      '--dsw-alias-bg-base': { light: '#FBF9F6', dark: '#171512' },
      '--dsw-alias-bg-layer-1': { light: '#FFFFFF', dark: '#1F1C18' },
      '--dsw-alias-bg-layer-2': { light: '#FDFBF8', dark: '#262320' },
      '--dsw-alias-bg-layer-3': { light: '#FFFFFF', dark: '#2D2A26' },
      '--dsw-alias-bg-overlay': { light: '#FFFFFF', dark: '#2E2A26' },
      '--dsw-alias-bg-module-platform': { light: '#F2EEE8', dark: '#2A2723' },
      '--dsw-alias-bg-multi-select': { light: '#F1EDE7', dark: '#2A2723' },
      '--dsw-alias-bg-skeleton': { light: 'rgba(64, 52, 40, 0.05)', dark: 'rgba(255, 246, 232, 0.07)' },
      '--dsw-alias-bg-document-preview': { light: '#F2EEE8', dark: '#171512' },

      '--dsw-alias-border-l1': { light: 'rgba(64, 52, 40, 0.07)', dark: 'rgba(255, 246, 232, 0.07)' },
      '--dsw-alias-border-l2': { light: 'rgba(64, 52, 40, 0.11)', dark: 'rgba(255, 246, 232, 0.12)' },
      '--dsw-alias-border-l3': { light: 'rgba(64, 52, 40, 0.14)', dark: 'rgba(255, 246, 232, 0.16)' },
      '--dsw-alias-border-l4': { light: 'rgba(64, 52, 40, 0.18)', dark: 'rgba(255, 246, 232, 0.20)' },

      '--dsw-alias-label-primary': { light: '#211E19', dark: '#F3EEE6' },
      '--dsw-alias-label-secondary': { light: '#5A544B', dark: '#C0B7A8' },
      '--dsw-alias-label-tertiary': { light: '#837B70', dark: '#948B7C' },
      '--dsw-alias-label-caption': { light: '#A0988B', dark: '#7C7466' },
      '--dsw-alias-label-dimmed': { light: '#D9D3C8', dark: '#3A352D' },
      '--dsw-alias-label-primary-dimmed': { light: '#EDE8E0', dark: '#EDE6DA' },
      '--dsw-alias-label-primary-bluish': { light: '#3A342C', dark: '#F3EEE6' },
      '--dsw-alias-label-document-preview': { light: '#5A544B', dark: '#948B7C' },
      '--dsw-alias-menu-icon': { light: '#4A443B', dark: '#EDE6DA' },

      '--dsw-specific-sidebar-fill': { light: '#F4F0EA', dark: '#1C1916' },
      '--dsw-specific-sidebar-nav-item-active': { light: '#EAE4DB', dark: '#2E2A25' },
      '--dsw-specific-sidebar-nav-item-active-accent': { light: '#E3DCCF', dark: '#3A342C' },
      '--dsw-specific-input-major': { light: '#FFFFFF', dark: '#2A2723' },
      '--dsw-specific-selector': { light: '#F1EDE7', dark: '#2A2723' },
      '--dsw-specific-tip': { light: '#F1EDE7', dark: '#2A2723' },

      '--dsw-alias-markdown-code-block': { light: '#F4F1EC', dark: '#201D19' },
      '--dsw-alias-markdown-code-block-banner': { light: '#EFEBE4', dark: '#262320' },
      '--dsw-alias-markdown-inline-code': { light: '#F1EDE6', dark: '#262320' },
      '--dsw-alias-markdown-citation': { light: '#F0ECE5', dark: '#262320' },
      '--dsw-alias-markdown-placeholder': { light: '#F4F0EA', dark: '#201D19' },
      '--dsw-alias-markdown-tag': { light: '#EFEAE2', dark: '#262320' },
      '--dsw-alias-markdown-code-segment-selected': { light: '#FFFFFF', dark: '#2D2A26' },
      '--dsw-alias-markdown-code-segment-unselected': { light: '#F3EFE9', dark: '#201D19' },

      '--dsw-alias-interactive-bg-hover': { light: 'rgba(64, 52, 40, 0.06)', dark: 'rgba(255, 246, 232, 0.08)' },
      '--dsw-alias-interactive-bg-active': { light: 'rgba(64, 52, 40, 0.10)', dark: 'rgba(255, 246, 232, 0.14)' },
      '--dsw-alias-interactive-bg-hover-solid': { light: '#F1EDE7', dark: '#2D2A26' },
      '--dsw-alias-interactive-bg-hover-accent': { light: 'rgba(64, 52, 40, 0.13)', dark: 'rgba(255, 246, 232, 0.22)' },

      '--dsw-alias-button-floating-fill': { light: '#FFFFFF', dark: '#2A2723' },
      '--dsw-alias-button-floating-hover': { light: '#F4F0EA', dark: '#332F2A' },
      '--dsw-alias-button-elevated-fill': { light: '#FFFFFF', dark: '#33302B' },
      '--dsw-alias-button-ghost-active-fill': { light: '#EFEAE2', dark: '#332F2A' },
      '--dsw-alias-button-ghost-active-hover': { light: '#E8E2D7', dark: '#3B362F' },
      '--dsw-alias-button-ghost-active-border': { light: '#CFC7B8', dark: '#4E473C' },
      '--dsw-alias-button-primary-dimmed': { light: '#EFEAE2', dark: '#332F2A' },

      '--dsw-alias-scrollbar-bg-l1': { light: '#DCD5C9', dark: '#4A443A' },
      '--dsw-alias-scrollbar-bg-l2': { light: '#D3CBBD', dark: '#565043' },
      '--dsw-alias-scrollbar-hover-l1': { light: '#C9C0B0', dark: '#5D564A' },
      '--dsw-alias-scrollbar-hover-l2': { light: '#BDB3A1', dark: '#6A6255' },

      '--dsw-alias-illustration-background': { light: '#F5F1EB', dark: '#2A2723' },
      '--dsw-alias-illustration-surface': { light: '#EFEAE2', dark: '#3A352C' },
      '--dsw-alias-illustration-backing': { light: '#DCD5C9', dark: '#4A443A' },
      '--dsw-alias-illustration-detail': { light: '#DCD5C9', dark: '#5A5245' },

      '--dsw-alias-menu-group-header-fill': {
        light: 'rgba(246, 243, 239, 0.94)',
        dark: 'rgba(38, 35, 32, 0.94)',
      },
    }

    /** Corner scales by preset; circles, capsules, and sub-4px details keep their own values. */
    const RADIUS_SCALES = {
      product: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px', panel: '28px' },
      standard: { xs: '6px', sm: '10px', md: '14px', lg: '18px', xl: '22px', panel: '32px' },
      large: { xs: '8px', sm: '14px', md: '18px', lg: '24px', xl: '28px', panel: '36px' },
    }

    const TEXT_FONT_DEFAULT = "system-ui, -apple-system, 'Segoe UI Variable Text', 'Segoe UI', "
      + "'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif"
    const CODE_FONT_DEFAULT = "'Cascadia Code', 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, "
      + "'Liberation Mono', Menlo, 'PingFang SC', 'Microsoft YaHei'"

    /**
     * Derive the override layer from one configuration value.
     * @param config - resolved settings section.
     * @returns token name to `{ light, dark }`, empty when the theme is disabled.
     */
    function tokensFor(config) {
      const tokens = {}
      if (config.enabled === false) return tokens

      if (config.palette !== 'product') Object.assign(tokens, WARM_COLORS)

      const scale = RADIUS_SCALES[config.radius] ?? RADIUS_SCALES.standard
      for (const [step, value] of Object.entries(scale)) tokens[`--dsw-radius-${step}`] = same(value)

      // Default stacks, not the composite variables the presenter writes: a
      // font chosen in Settings still wins, and an empty field lands here.
      tokens['--dsh-font-family-text-default'] = same(config.textFont || TEXT_FONT_DEFAULT)
      tokens['--dsh-font-family-code-default'] = same(config.codeFont || CODE_FONT_DEFAULT)

      // The composite shorthand embeds size and line-height, so it repeats the
      // product expression verbatim instead of pinning pixels: the type ladder
      // still follows the Settings font size.
      const weight = String(config.strongWeight === 600 ? 600 : 500)
      tokens['--dsw-font-markdown-base-strong'] = same(
        `${weight} var(--dsh-content-font-size, 14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family)`,
      )
      tokens['--dsw-font-markdown-base-strong-font-weight'] = same(weight)
      return tokens
    }

    // ---------------------------------------------------------------- locales

    /** English copy (the key-set source of truth). */
    const en = {
      'nav': 'Linen theme',
      'title': 'Linen theme',
      'intro': 'Changes apply immediately and are saved to the Host settings document, so they survive a reload and other browsers. Brand colors, state colors, and font sizes stay as the product defines them.',
      'enable.title': 'Enable the Linen theme',
      'enable.hint': 'Turning this off restores every product default',
      'palette.title': 'Palette',
      'palette.hint': 'Warm retunes surfaces, borders, and text; Product keeps the original colors and applies only corners and fonts',
      'palette.warm': 'Warm',
      'palette.product': 'Product',
      'radius.title': 'Corner radius',
      'radius.hint': 'Circles, capsules, and hairline details keep their own geometry',
      'radius.product': 'Product',
      'radius.standard': 'Soft',
      'radius.large': 'Round',
      'weight.title': 'Emphasis weight',
      'weight.hint': 'Weight of emphasized body text; the product default is 600',
      'textFont.title': 'Body font',
      'textFont.hint': 'Leave empty for the theme stack; a font chosen in Appearance still wins',
      'codeFont.title': 'Code font',
      'codeFont.hint': 'Code blocks, inline code, and code text outside the terminal',
      'font.placeholder': 'Comma-separated font names',
      'loading': 'Reading configuration…',
      'noChannel': 'This page cannot reach the configuration channel, so it is unavailable.',
      'unavailable.title': 'The Host does not expose this plugin’s settings namespace, so nothing here can be saved.',
      'unavailable.hint': 'Namespaces the Host currently serves:',
      'empty': '(none)',
      'notReady': 'Configuration is not ready; the change was not saved',
      'rejected': 'The Host refused the change; values reverted to the saved state',
      'failed': 'Could not save:',
      'unknownError': 'unknown error',
    }

    /** Chinese copy. */
    const zh = {
      'nav': '亚麻主题',
      'title': '亚麻主题',
      'intro': '调整后立即生效，保存到宿主设置文档，刷新页面或换浏览器都还在。品牌色、语义状态色和字号保持产品定义。',
      'enable.title': '启用亚麻主题',
      'enable.hint': '关闭后所有数值回到产品默认',
      'palette.title': '配色',
      'palette.hint': '暖色重调表面、边框和文字；产品原色只应用圆角与字体',
      'palette.warm': '暖中性',
      'palette.product': '产品原色',
      'radius.title': '圆角',
      'radius.hint': '圆圈、胶囊和发丝级细节保持自身几何',
      'radius.product': '产品默认',
      'radius.standard': '柔和',
      'radius.large': '圆润',
      'weight.title': '强调文字字重',
      'weight.hint': '加粗正文的重量，产品默认 600',
      'textFont.title': '正文字体',
      'textFont.hint': '留空使用主题字体栈；在“外观”里手选的字体仍然优先',
      'codeFont.title': '代码字体',
      'codeFont.hint': '代码块、行内代码，以及终端以外的代码文本',
      'font.placeholder': '字体名，逗号分隔',
      'loading': '正在读取配置…',
      'noChannel': '这一页没有拿到配置通道，暂时无法使用。',
      'unavailable.title': '宿主没有暴露这个插件的配置命名空间，这里的改动存不住。',
      'unavailable.hint': '宿主当前提供的命名空间：',
      'empty': '（空）',
      'notReady': '配置还没就绪，改动没有保存',
      'rejected': '宿主拒绝了这次修改，数值已回到保存过的状态',
      'failed': '写入失败：',
      'unknownError': '未知错误',
    }

    /** Japanese copy. */
    const ja = {
      'nav': 'リネンテーマ',
      'title': 'リネンテーマ',
      'intro': '変更はすぐに反映され、ホストの設定ドキュメントに保存されます。再読み込みや別のブラウザでも保持されます。ブランド色・状態色・文字サイズは製品の定義のままです。',
      'enable.title': 'リネンテーマを有効にする',
      'enable.hint': 'オフにするとすべて製品の既定値に戻ります',
      'palette.title': '配色',
      'palette.hint': '暖色は面・境界線・文字を調整します。製品の色は角丸とフォントのみ適用します',
      'palette.warm': '暖色',
      'palette.product': '製品の色',
      'radius.title': '角丸',
      'radius.hint': '円・カプセル・ヘアラインの細部は独自の形状を保ちます',
      'radius.product': '製品の既定',
      'radius.standard': 'やわらか',
      'radius.large': '丸め',
      'weight.title': '強調テキストの太さ',
      'weight.hint': '強調する本文の太さ。製品の既定は 600 です',
      'textFont.title': '本文フォント',
      'textFont.hint': '空欄ならテーマのフォント。外観で選んだフォントが優先されます',
      'codeFont.title': 'コードフォント',
      'codeFont.hint': 'コードブロック、インラインコード、ターミナル以外のコード',
      'font.placeholder': 'フォント名をカンマ区切りで',
      'loading': '設定を読み込み中…',
      'noChannel': 'このページは設定チャネルに接続できないため利用できません。',
      'unavailable.title': 'ホストがこのプラグインの設定名前空間を公開していないため、ここでの変更は保存できません。',
      'unavailable.hint': 'ホストが現在提供している名前空間：',
      'empty': '（なし）',
      'notReady': '設定の準備ができておらず、変更は保存されていません',
      'rejected': 'ホストが変更を拒否しました。値は保存済みの状態に戻りました',
      'failed': '保存できませんでした：',
      'unknownError': '不明なエラー',
    }

    /** Spanish copy. */
    const es = {
      'nav': 'Tema Lino',
      'title': 'Tema Lino',
      'intro': 'Los cambios se aplican al instante y se guardan en el documento de ajustes del Host, por lo que sobreviven a una recarga y a otros navegadores. Los colores de marca, los colores de estado y los tamaños de letra siguen siendo los del producto.',
      'enable.title': 'Activar el tema Lino',
      'enable.hint': 'Al desactivarlo se restauran todos los valores del producto',
      'palette.title': 'Paleta',
      'palette.hint': 'Cálido ajusta superficies, bordes y texto; Producto conserva los colores originales y solo aplica esquinas y fuentes',
      'palette.warm': 'Cálido',
      'palette.product': 'Producto',
      'radius.title': 'Radio de esquina',
      'radius.hint': 'Los círculos, las cápsulas y los detalles finos conservan su geometría',
      'radius.product': 'Producto',
      'radius.standard': 'Suave',
      'radius.large': 'Redondeado',
      'weight.title': 'Grosor del énfasis',
      'weight.hint': 'Grosor del texto enfatizado; el valor del producto es 600',
      'textFont.title': 'Fuente del cuerpo',
      'textFont.hint': 'Déjalo vacío para usar la del tema; una fuente elegida en Apariencia sigue teniendo prioridad',
      'codeFont.title': 'Fuente del código',
      'codeFont.hint': 'Bloques de código, código en línea y texto de código fuera de la terminal',
      'font.placeholder': 'Nombres de fuente separados por comas',
      'loading': 'Leyendo la configuración…',
      'noChannel': 'Esta página no puede acceder al canal de configuración, así que no está disponible.',
      'unavailable.title': 'El Host no expone el espacio de nombres de ajustes de este plugin, así que aquí no se puede guardar nada.',
      'unavailable.hint': 'Espacios de nombres que el Host ofrece ahora:',
      'empty': '(ninguno)',
      'notReady': 'La configuración no está lista; el cambio no se guardó',
      'rejected': 'El Host rechazó el cambio; los valores volvieron al estado guardado',
      'failed': 'No se pudo guardar:',
      'unknownError': 'error desconocido',
    }

    /** French copy. */
    const fr = {
      'nav': 'Thème Lin',
      'title': 'Thème Lin',
      'intro': 'Les changements s’appliquent immédiatement et sont enregistrés dans le document de réglages de l’hôte : ils survivent à un rechargement et aux autres navigateurs. Les couleurs de marque, les couleurs d’état et les tailles de police restent celles du produit.',
      'enable.title': 'Activer le thème Lin',
      'enable.hint': 'La désactivation rétablit toutes les valeurs du produit',
      'palette.title': 'Palette',
      'palette.hint': 'Chaud retouche les surfaces, les bordures et le texte ; Produit conserve les couleurs d’origine et n’applique que les angles et les polices',
      'palette.warm': 'Chaud',
      'palette.product': 'Produit',
      'radius.title': 'Rayon des angles',
      'radius.hint': 'Les cercles, les capsules et les détails fins gardent leur propre géométrie',
      'radius.product': 'Produit',
      'radius.standard': 'Doux',
      'radius.large': 'Arrondi',
      'weight.title': 'Graisse de l’accentuation',
      'weight.hint': 'Graisse du texte mis en valeur ; la valeur du produit est 600',
      'textFont.title': 'Police du corps',
      'textFont.hint': 'Laissez vide pour la police du thème ; une police choisie dans Apparence reste prioritaire',
      'codeFont.title': 'Police du code',
      'codeFont.hint': 'Blocs de code, code en ligne et texte de code hors terminal',
      'font.placeholder': 'Noms de police séparés par des virgules',
      'loading': 'Lecture de la configuration…',
      'noChannel': 'Cette page n’atteint pas le canal de configuration, elle est donc indisponible.',
      'unavailable.title': 'L’hôte n’expose pas l’espace de noms des réglages de ce plugin : rien ne peut être enregistré ici.',
      'unavailable.hint': 'Espaces de noms actuellement fournis par l’hôte :',
      'empty': '(aucun)',
      'notReady': 'La configuration n’est pas prête ; la modification n’a pas été enregistrée',
      'rejected': 'L’hôte a refusé la modification ; les valeurs sont revenues à l’état enregistré',
      'failed': 'Échec de l’enregistrement :',
      'unknownError': 'erreur inconnue',
    }

    /** German copy. */
    const de = {
      'nav': 'Leinen-Design',
      'title': 'Leinen-Design',
      'intro': 'Änderungen wirken sofort und werden im Einstellungsdokument des Hosts gespeichert, bleiben also nach einem Neuladen und in anderen Browsern erhalten. Markenfarben, Statusfarben und Schriftgrößen bleiben wie im Produkt definiert.',
      'enable.title': 'Leinen-Design aktivieren',
      'enable.hint': 'Ausschalten stellt alle Produktvorgaben wieder her',
      'palette.title': 'Palette',
      'palette.hint': 'Warm überarbeitet Flächen, Rahmen und Text; Produkt behält die Originalfarben und wendet nur Ecken und Schriften an',
      'palette.warm': 'Warm',
      'palette.product': 'Produkt',
      'radius.title': 'Eckenradius',
      'radius.hint': 'Kreise, Kapseln und Haarlinien-Details behalten ihre eigene Geometrie',
      'radius.product': 'Produkt',
      'radius.standard': 'Sanft',
      'radius.large': 'Rund',
      'weight.title': 'Stärke der Hervorhebung',
      'weight.hint': 'Stärke hervorgehobenen Fließtexts; Produktvorgabe ist 600',
      'textFont.title': 'Textschrift',
      'textFont.hint': 'Leer lassen für die Schrift des Designs; eine in „Darstellung“ gewählte Schrift hat weiterhin Vorrang',
      'codeFont.title': 'Codeschrift',
      'codeFont.hint': 'Codeblöcke, Inline-Code und Codetext außerhalb des Terminals',
      'font.placeholder': 'Schriftnamen, durch Kommas getrennt',
      'loading': 'Konfiguration wird gelesen…',
      'noChannel': 'Diese Seite erreicht den Konfigurationskanal nicht und ist daher nicht verfügbar.',
      'unavailable.title': 'Der Host stellt den Einstellungsnamensraum dieses Plugins nicht bereit, daher kann hier nichts gespeichert werden.',
      'unavailable.hint': 'Namensräume, die der Host derzeit bereitstellt:',
      'empty': '(keine)',
      'notReady': 'Die Konfiguration ist nicht bereit; die Änderung wurde nicht gespeichert',
      'rejected': 'Der Host hat die Änderung abgelehnt; die Werte kehrten zum gespeicherten Stand zurück',
      'failed': 'Speichern fehlgeschlagen:',
      'unknownError': 'unbekannter Fehler',
    }

    /** Portuguese copy. */
    const pt = {
      'nav': 'Tema Linho',
      'title': 'Tema Linho',
      'intro': 'As alterações aplicam-se na hora e ficam guardadas no documento de definições do anfitrião, por isso sobrevivem a um recarregamento e a outros navegadores. As cores de marca, as cores de estado e os tamanhos de letra mantêm-se como o produto define.',
      'enable.title': 'Ativar o tema Linho',
      'enable.hint': 'Desativar restaura todos os valores do produto',
      'palette.title': 'Paleta',
      'palette.hint': 'Quente ajusta superfícies, contornos e texto; Produto mantém as cores originais e aplica apenas cantos e tipos de letra',
      'palette.warm': 'Quente',
      'palette.product': 'Produto',
      'radius.title': 'Raio dos cantos',
      'radius.hint': 'Círculos, cápsulas e detalhes finos mantêm a sua própria geometria',
      'radius.product': 'Produto',
      'radius.standard': 'Suave',
      'radius.large': 'Arredondado',
      'weight.title': 'Peso do destaque',
      'weight.hint': 'Peso do texto destacado; o valor do produto é 600',
      'textFont.title': 'Tipo de letra do corpo',
      'textFont.hint': 'Deixe vazio para usar o do tema; um tipo escolhido em Aparência continua a ter prioridade',
      'codeFont.title': 'Tipo de letra do código',
      'codeFont.hint': 'Blocos de código, código em linha e texto de código fora do terminal',
      'font.placeholder': 'Nomes de tipos de letra separados por vírgulas',
      'loading': 'A ler a configuração…',
      'noChannel': 'Esta página não alcança o canal de configuração, por isso não está disponível.',
      'unavailable.title': 'O anfitrião não expõe o espaço de nomes de definições deste plugin, por isso nada aqui pode ser guardado.',
      'unavailable.hint': 'Espaços de nomes que o anfitrião serve agora:',
      'empty': '(nenhum)',
      'notReady': 'A configuração ainda não está pronta; a alteração não foi guardada',
      'rejected': 'O anfitrião recusou a alteração; os valores voltaram ao estado guardado',
      'failed': 'Falha ao guardar:',
      'unknownError': 'erro desconhecido',
    }

    /** Russian copy. */
    const ru = {
      'nav': 'Тема «Лён»',
      'title': 'Тема «Лён»',
      'intro': 'Изменения применяются сразу и сохраняются в документе настроек хоста, поэтому переживают перезагрузку и действуют в других браузерах. Фирменные цвета, цвета состояний и размеры шрифта остаются такими, как заданы продуктом.',
      'enable.title': 'Включить тему «Лён»',
      'enable.hint': 'Выключение возвращает все значения продукта',
      'palette.title': 'Палитра',
      'palette.hint': 'Тёплая перекрашивает поверхности, границы и текст; «Продукт» сохраняет исходные цвета и применяет только скругления и шрифты',
      'palette.warm': 'Тёплая',
      'palette.product': 'Продукт',
      'radius.title': 'Радиус скругления',
      'radius.hint': 'Круги, капсулы и тонкие детали сохраняют собственную геометрию',
      'radius.product': 'Продукт',
      'radius.standard': 'Мягкий',
      'radius.large': 'Округлый',
      'weight.title': 'Насыщенность выделения',
      'weight.hint': 'Насыщенность выделенного текста; значение продукта — 600',
      'textFont.title': 'Шрифт текста',
      'textFont.hint': 'Оставьте пустым для шрифта темы; шрифт, выбранный в «Оформлении», по-прежнему важнее',
      'codeFont.title': 'Шрифт кода',
      'codeFont.hint': 'Блоки кода, встроенный код и текст кода вне терминала',
      'font.placeholder': 'Названия шрифтов через запятую',
      'loading': 'Чтение конфигурации…',
      'noChannel': 'Этой странице недоступен канал конфигурации, поэтому она не работает.',
      'unavailable.title': 'Хост не предоставляет пространство имён настроек этого плагина, поэтому здесь ничего нельзя сохранить.',
      'unavailable.hint': 'Пространства имён, которые хост предоставляет сейчас:',
      'empty': '(нет)',
      'notReady': 'Конфигурация ещё не готова; изменение не сохранено',
      'rejected': 'Хост отклонил изменение; значения вернулись к сохранённому состоянию',
      'failed': 'Не удалось сохранить:',
      'unknownError': 'неизвестная ошибка',
    }

    const DICTS = { en, zh, ja, es, fr, de, ru, pt }

    // ----------------------------------------------------------------- styles

    const S = {
      page: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' },
      heading: { margin: 0, fontSize: '16px', lineHeight: '26px', fontWeight: 500, color: 'var(--dsw-alias-label-primary)' },
      intro: { margin: 0, fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' },
      card: {
        display: 'flex',
        flexDirection: 'column',
        padding: '0 16px',
        border: '0.5px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l4))',
        borderRadius: 'var(--dsw-radius-xl)',
        background: 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2))',
      },
      row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 0' },
      divider: { borderTop: '0.5px solid var(--dsw-alias-border-l1)' },
      text: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
      label: { fontSize: '14px', lineHeight: '22px', color: 'var(--dsw-alias-label-primary)' },
      hint: { fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' },
      choices: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '6px' },
      notice: { margin: 0, fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-state-warn-primary)' },
      muted: { margin: 0, fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-tertiary)' },
      served: {
        margin: 0,
        padding: '12px',
        overflow: 'auto',
        maxHeight: '220px',
        fontSize: '12px',
        lineHeight: '18px',
        fontFamily: 'var(--ds-font-family-code)',
        color: 'var(--dsw-alias-label-secondary)',
        background: 'var(--dsw-alias-markdown-code-block)',
        border: '0.5px solid var(--dsw-alias-border-l1)',
        borderRadius: 'var(--dsw-radius-md)',
      },
    }

    /** One token-styled choice chip; the selected state mirrors the Appearance cubes. */
    function choiceStyle(selected) {
      return {
        padding: '5px 12px',
        font: 'inherit',
        fontSize: '13px',
        lineHeight: '18px',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        color: `var(--dsw-alias-label-${selected ? 'primary' : 'secondary'})`,
        background: selected ? 'var(--dsw-alias-button-ghost-active-fill)' : 'transparent',
        border: `0.5px solid var(${selected ? '--dsw-alias-button-ghost-active-border' : '--dsw-alias-border-l2'})`,
        borderRadius: 'var(--dsw-radius-sm)',
      }
    }

    /**
     * One settings row: label and hint on the left, one control on the right.
     * @param props.label - row title.
     * @param props.hint - one-line explanation under the title.
     * @param props.divider - whether the row draws the separator above it.
     * @param props.children - the control.
     */
    function Row({ label, hint, divider, children }) {
      return h('div', { style: divider ? { ...S.row, ...S.divider } : S.row },
        h('div', { style: S.text },
          h('span', { style: S.label }, label),
          hint === undefined ? null : h('span', { style: S.hint }, hint)),
        children)
    }

    /**
     * A radiogroup of mutually exclusive chips.
     * @param props.name - accessible group name.
     * @param props.value - the selected option value.
     * @param props.options - value and label pairs in display order.
     * @param props.onSelect - called with the chosen value.
     * @param props.disabled - whether every chip refuses input.
     */
    function Choices({ name, value, options, onSelect, disabled }) {
      return h('div', { role: 'radiogroup', 'aria-label': name, style: S.choices },
        options.map(option => h('button', {
          key: option.value,
          type: 'button',
          role: 'radio',
          'aria-checked': option.value === value,
          disabled,
          style: choiceStyle(option.value === value),
          onClick: () => { if (option.value !== value) onSelect(option.value) },
        }, option.label)))
    }

    /**
     * The settings page: reads the shared config form and writes single fields.
     * @param props - slot props plus the injected `save` and the bound `useConfig`.
     */
    function ThemeSection(props) {
      const t = typeof props.t === 'function' ? props.t : key => key
      // The bound hook is a selector hook, not a bare reader: it throws inside
      // render when called without one, and the slot error boundary would turn
      // that into a blank panel.
      if (typeof props.useConfig !== 'function') {
        return h('p', { style: S.notice }, t('noChannel'))
      }
      const snapshot = props.useConfig(value => value)
      const config = { ...DEFAULTS, ...(snapshot?.value ?? {}) }
      const save = typeof props.save === 'function' ? props.save : () => Promise.resolve(false)

      if (snapshot.status === 'unavailable') {
        const served = Array.isArray(snapshot.served) ? snapshot.served : []
        return h('div', { style: S.page },
          h('p', { style: S.notice }, t('unavailable.title')),
          h('p', { style: S.hint }, t('unavailable.hint')),
          h('pre', { style: S.served }, served.length === 0 ? t('empty') : served.join('\n')))
      }
      if (snapshot.status !== 'ready') {
        return h('div', { style: S.page }, h('p', { style: S.muted }, t('loading')))
      }

      const error = snapshot.error == null
        ? null
        : h('p', { style: S.notice }, `${snapshot.error}`)

      return h('div', { style: S.page },
        h('h2', { style: S.heading }, t('title')),
        h('p', { style: S.intro }, t('intro')),
        error,

        h('div', { style: S.card },
          h(Row, { label: t('enable.title'), hint: t('enable.hint') },
            h(Switch, {
              checked: config.enabled,
              label: t('enable.title'),
              onChange: next => { save('enabled', next) },
            }))),

        h('div', { style: S.card },
          h(Row, { label: t('palette.title'), hint: t('palette.hint') },
            h(Choices, {
              name: t('palette.title'),
              value: config.palette,
              options: [
                { value: 'warm', label: t('palette.warm') },
                { value: 'product', label: t('palette.product') },
              ],
              onSelect: next => { save('palette', next) },
            })),
          h(Row, { divider: true, label: t('radius.title'), hint: t('radius.hint') },
            h(Choices, {
              name: t('radius.title'),
              value: config.radius,
              options: [
                { value: 'product', label: t('radius.product') },
                { value: 'standard', label: t('radius.standard') },
                { value: 'large', label: t('radius.large') },
              ],
              onSelect: next => { save('radius', next) },
            })),
          h(Row, { divider: true, label: t('weight.title'), hint: t('weight.hint') },
            h(Choices, {
              name: t('weight.title'),
              value: String(config.strongWeight),
              options: [{ value: '500', label: '500' }, { value: '600', label: '600' }],
              onSelect: next => { save('strongWeight', Number(next)) },
            }))),

        h('div', { style: S.card },
          h(Row, { label: t('textFont.title'), hint: t('textFont.hint') },
            h(Input, {
              'aria-label': t('textFont.title'),
              placeholder: t('font.placeholder'),
              defaultValue: config.textFont,
              style: { width: '240px' },
              onBlur: event => { save('textFont', event.currentTarget.value.trim()) },
              onKeyDown: (event) => { if (event.key === 'Enter') event.currentTarget.blur() },
            })),
          h(Row, { divider: true, label: t('codeFont.title'), hint: t('codeFont.hint') },
            h(Input, {
              'aria-label': t('codeFont.title'),
              placeholder: t('font.placeholder'),
              defaultValue: config.codeFont,
              style: { width: '240px' },
              onBlur: event => { save('codeFont', event.currentTarget.value.trim()) },
              onKeyDown: (event) => { if (event.key === 'Enter') event.currentTarget.blur() },
            }))))
    }

    return {
      inject: ['theme', 'slots', 'configForms', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(LOCALE, DICTS), 'linen: locale dictionaries')

        // The Host reports this plugin's settings namespace as the Loader entry
        // id, which the bundle wrapper composes (`include:<row id>`). Resolve it
        // from the served directory instead of hardcoding one candidate, so the
        // page keeps working wherever the row is mounted.
        const describe = ctx.configForms.describe()
        const t = ctx.locale.bind(LOCALE)

        /** Stable observable the renderer binds as `useConfig`. */
        let snapshot = { status: 'loading', value: undefined, writable: false, error: null }
        const listeners = new Set()
        const source = {
          getSnapshot: () => snapshot,
          subscribe: (listener) => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
          },
        }
        const publish = (next) => {
          snapshot = next
          for (const listener of listeners) listener()
        }

        let bound = null
        let unbind = null
        let layer = null
        let boundNamespace = null

        /** Last accepted value from the Host; the optimistic map sits on top of it. */
        let serverValue

        /**
         * Values chosen but not yet confirmed by the Host. Applying them before
         * the write settles keeps a click responsive: a settings write costs a
         * Host round trip plus a full describe re-read, which is far too long to
         * leave the chip looking unpressed.
         */
        let optimistic = {}

        /** The value every consumer and the token layer should currently use. */
        const effective = () => ({ ...DEFAULTS, ...(serverValue ?? {}), ...optimistic })

        /** Signature of the token map last handed to the theme service. */
        let lastSignature = null

        // One live token layer: every accepted value replaces it, and a
        // disabled theme drops it so the product values return. The theme
        // service republishes its whole snapshot on every call, and the
        // presenter then rewrites every token inline on `body` and forces a
        // style flush — so a rebuild that changes nothing is pure cost. The
        // Host echoes each write at least twice (the folded write answer and
        // the `settings/document-updated` describe), which is what makes an
        // unconditional rebuild feel like lag.
        const sync = (value) => {
          const tokens = tokensFor({ ...DEFAULTS, ...(value ?? {}) })
          const signature = JSON.stringify(tokens)
          if (signature === lastSignature) return
          lastSignature = signature
          if (layer !== null) {
            layer()
            layer = null
          }
          if (Object.keys(tokens).length > 0) layer = ctx.theme.overrideTokens('linen', tokens)
        }

        // Paint the defaults before the settings round-trip settles, so a slow
        // Host read never leaves the product palette showing.
        sync(undefined)

        const adopt = () => {
          const current = bound.getSnapshot()
          serverValue = current.value
          // Drop optimistic entries the Host has now confirmed.
          for (const [field, chosen] of Object.entries(optimistic)) {
            if ((serverValue ?? {})[field] === chosen) delete optimistic[field]
          }
          publish({ ...current, value: effective(), error: null, namespace: boundNamespace })
          sync(effective())
        }

        const fail = (message) => {
          publish({ ...snapshot, error: message })
          return false
        }

        const write = async (field, value) => {
          if (bound === null) return fail(t('notReady'))
          optimistic[field] = value
          publish({ ...snapshot, value: effective(), error: null })
          sync(effective())
          try {
            const accepted = await bound.set(field, value)
            // The form folds the write answer before `set` resolves, so the
            // Host's own value has already been adopted by now.
            delete optimistic[field]
            if (!accepted) {
              publish({ ...snapshot, value: effective(), error: t('rejected') })
              sync(effective())
              return false
            }
            return true
          } catch (error) {
            delete optimistic[field]
            const detail = error instanceof Error ? error.message : t('unknownError')
            publish({ ...snapshot, value: effective(), error: `${t('failed')} ${detail}` })
            sync(effective())
            return false
          }
        }

        const refresh = () => {
          const directory = describe.getSnapshot()
          const view = directory.view
          if (view === undefined) return
          const names = view.namespaces.map(row => row.ns)
          // Three ways to find our entry, from strict to defensive: the row id,
          // the id under a wrapper path, and finally the schema fingerprint —
          // `strongWeight` is unique to this plugin's Config.
          const exact = names.includes(NAMESPACE) ? NAMESPACE : undefined
          const suffix = exact === undefined
            ? names.find(candidate => candidate.endsWith(`:${NAMESPACE}`))
            : undefined
          const fingerprinted = exact === undefined && suffix === undefined
            ? view.namespaces.find(row => {
              const properties = row.schema?.properties
              return properties !== undefined && Object.hasOwn(properties, 'strongWeight')
            })?.ns
            : undefined
          const ns = exact ?? suffix ?? fingerprinted
          if (ns === undefined) {
            // Nothing in the directory matches: keep the served list in the
            // snapshot so the page reports what the Host actually offers.
            if (bound === null) {
              publish({
                status: directory.status === 'ready' ? 'unavailable' : 'loading',
                value: undefined,
                writable: view.writable,
                error: null,
                namespace: NAMESPACE,
                served: names,
              })
            }
            return
          }
          if (bound !== null && boundNamespace === ns) return
          if (unbind !== null) unbind()
          boundNamespace = ns
          bound = ctx.configForms.get(ns)
          unbind = bound.subscribe(adopt)
          adopt()
        }

        ctx.effect(() => describe.subscribe(refresh), 'linen: settings directory')
        ctx.effect(() => refresh(), 'linen: initial namespace resolution')
        ctx.effect(() => () => {
          if (unbind !== null) unbind()
          unbind = null
          bound = null
        }, 'linen: config binding')

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: NAMESPACE,
          order: 65,
          label: () => t('nav'),
          locale: LOCALE,
          inject: () => ({
            hooks: { config: source },
            save: write,
          }),
        }, ThemeSection))
      },
    }
  },
})
