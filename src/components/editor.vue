<template>
  <div class="editor">
    <client-only>
      <editor-menu-bubble
        class="menububble"
        :editor="editor"
        @hide="hideLinkMenu"
        v-slot="{ commands, isActive, getMarkAttrs, menu }"
      >
        <div
          class="menububble"
          :class="{ 'is-active': menu.isActive }"
          :style="`left: ${menu.left<130?130:menu.left}px; bottom: ${menu.bottom}px;`"
        >
          <v-form
            class="menububble__form"
            v-if="linkMenuIsActive"
            @submit.prevent="setLinkUrl(commands.link, linkUrl)"
          >
            <v-text-field
              dense
              solo
              hide-details
              type="text"
              v-model="linkUrl"
              placeholder="https://"
              ref="linkInput"
              @keydown.esc="hideLinkMenu"
            >
              <v-btn @click="setLinkUrl(commands.link, null)" slot="append" icon>
                <v-icon>{{mdiDelete}}</v-icon>
              </v-btn>
            </v-text-field>
          </v-form>

          <template v-else>
            <v-btn
              @click="showLinkMenu(getMarkAttrs('link'))"
              :class="{ 'is-active': isActive.link() }"
            >
              <span>{{ isActive.link() ? '更新链接' : '添加链接'}}</span>
              <v-icon>{{mdiLinkPlus}}</v-icon>
            </v-btn>
          </template>
        </div>
      </editor-menu-bubble>
      <editor-floating-menu :editor="editor" v-slot="{ commands, isActive, menu }">
        <div
          class="floating-menu"
          :class="{ 'is-active': menu.isActive }"
          :style="`top: ${menu.top}px`"
        >
          <v-btn
            icon
            :color="isActive.heading({ level: 2 })?'pink':''"
            @click="commands.heading({ level: 2 })"
          >
            <v-icon>{{mdiFormatHeader2}}</v-icon>
          </v-btn>
          <v-btn
            icon
            :color="isActive.heading({ level: 3 })?'pink':''"
            @click="commands.heading({ level: 3 })"
          >
            <v-icon>{{mdiFormatHeader3}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.bullet_list()?'pink':''" @click="commands.bullet_list">
            <v-icon>{{mdiFormatListBulleted}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.ordered_list()?'pink':''" @click="commands.ordered_list">
            <v-icon>{{mdiFormatListNumbered}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.code_block()?'pink':''" @click="commands.code_block">
            <v-icon>{{mdiCodeTags}}</v-icon>
          </v-btn>
          <v-btn icon @click="uploadImageModal(commands.image)">
            <v-icon>{{mdiImage}}</v-icon>
          </v-btn>
        </div>
      </editor-floating-menu>
      <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }" class="sticky">
        <div class="menubar">
          <v-btn icon :color="isActive.bold()?'pink':''" @click="commands.bold">
            <v-icon>{{mdiFormatBold}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.italic()?'pink':''" @click="commands.italic">
            <v-icon>{{mdiFormatItalic}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.strike()?'pink':''" @click="commands.strike">
            <v-icon>{{mdiFormatStrikethrough}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.underline()?'pink':''" @click="commands.underline">
            <v-icon>{{mdiFormatUnderline}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.code()?'pink':''" @click="commands.code">
            <v-icon>{{mdiCodeTags}}</v-icon>
          </v-btn>
          <v-btn icon @click="uploadImageModal(commands.image)">
            <v-icon>{{mdiImage}}</v-icon>
          </v-btn>
          <v-dialog v-model="uploadDialog" max-width="600">
            <v-card>
              <v-card-title>添加图片</v-card-title>
              <v-card-text>
                <v-form ref="form3" v-model="fileValid">
                  <v-container>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          v-model="remoteImage"
                          type="text"
                          label="图片链接"
                          hint="远程图片"
                          required
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12">
                        <v-file-input
                          show-size
                          v-model="localImage"
                          :rules="[value => !value || value.size < 2000000 || '图片不能超过 2 MB!',]"
                          accept="image/png, image/jpeg, image/bmp"
                          placeholder="选择本地图片"
                          :prepend-icon="mdiImage"
                          label="上传图片"
                        >
                          <v-btn
                            :disabled="!fileValid"
                            @click="upload()"
                            slot="append"
                            :loading="uploadLoading"
                          >点击上传</v-btn>
                        </v-file-input>
                      </v-col>
                    </v-row>
                  </v-container>
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn text @click="uploadDialog = false">关闭</v-btn>
                <v-btn
                  class="primary"
                  @click="insertImage(commands.image)"
                  :disabled="!fileValid"
                >确定</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-btn icon :color="isActive.paragraph()?'pink':''" @click="commands.paragraph">
            <v-icon>{{mdiFormatParagraph}}</v-icon>
          </v-btn>
          <v-btn
            icon
            :color="isActive.heading({ level: 2 })?'pink':''"
            @click="commands.heading({ level: 2 })"
          >
            <v-icon>{{mdiFormatHeader2}}</v-icon>
          </v-btn>
          <v-btn
            icon
            :color="isActive.heading({ level: 3 })?'pink':''"
            @click="commands.heading({ level: 3 })"
          >
            <v-icon>{{mdiFormatHeader3}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.bullet_list()?'pink':''" @click="commands.bullet_list">
            <v-icon>{{mdiFormatListBulleted}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.ordered_list()?'pink':''" @click="commands.ordered_list">
            <v-icon>{{mdiFormatListNumbered}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.blockquote()?'pink':''" @click="commands.blockquote">
            <v-icon>{{mdiFormatQuoteOpen}}</v-icon>
          </v-btn>
          <v-btn icon :color="isActive.code_block()?'pink':''" @click="commands.code_block">
            <v-icon>{{mdiCodeTags}}</v-icon>
          </v-btn>
          <v-btn icon @click="commands.horizontal_rule">
            <v-icon>{{mdiMinus}}</v-icon>
          </v-btn>
          <v-btn icon @click="commands.undo">
            <v-icon>{{mdiUndo}}</v-icon>
          </v-btn>
          <v-btn icon @click="commands.redo">
            <v-icon>{{mdiRedo}}</v-icon>
          </v-btn>
        </div>
      </editor-menu-bar>
      <editor-content class="v-card__text box__shadow" :editor="editor" />
    </client-only>
  </div>
</template>
<script>
import Image from '~/components/plugins/image';
import gql from "graphql-tag";
import {
  Editor,
  EditorContent,
  EditorMenuBar,
  EditorMenuBubble,
  EditorFloatingMenu,
} from "tiptap";
import {
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatStrikethrough,
  mdiFormatUnderline,
  mdiCodeTags,
  mdiFormatParagraph,
  mdiFormatHeader2,
  mdiFormatHeader3,
  mdiFormatListBulleted,
  mdiFormatListNumbered,
  mdiFormatQuoteOpen,
  mdiMinus,
  mdiUndo,
  mdiRedo,
  mdiDelete,
  mdiImage,
  mdiPlus,
  mdiLinkPlus,
} from "@mdi/js";
import {
  Blockquote,
  CodeBlock,
  HardBreak,
  Heading,
  HorizontalRule,
  OrderedList,
  BulletList,
  ListItem,
  TodoItem,
  TodoList,
  Bold,
  Code,
  Italic,
  Link,
  Strike,
  Underline,
  History,
  TrailingNode,
} from "tiptap-extensions";
export default {
  mounted() {
    this.editor = new Editor({
      extensions: [
        new Blockquote(),
        new BulletList(),
        new CodeBlock(),
        new HardBreak(),
        new Heading({ levels: [2, 3] }),
        new HorizontalRule(),
        new ListItem(),
        new OrderedList(),
        new TodoItem(),
        new TodoList(),
        new Link(),
        new Bold(),
        new Image(),
        new Code(),
        new Italic(),
        new Strike(),
        new Underline(),
        new History(),
        new TrailingNode({
          node: 'paragraph',
          notAfter: ['paragraph'],
        }),
      ],
      content: this.value,
      onUpdate: ({ getHTML }) => {
        this.$emit("update", getHTML());
      },
    });
  },
  props: {
    value: String,
  },
  model: {
    prop: "value", //绑定的值，通过父组件传递
    event: "update", //自定义事件名
  },
  methods: {
    showLinkMenu(attrs) {
      this.linkUrl = attrs.href;
      this.linkMenuIsActive = true;
      this.$nextTick(() => {
        this.$refs.linkInput.focus();
      });
    },
    hideLinkMenu() {
      this.linkUrl = null;
      this.linkMenuIsActive = false;
    },
    setLinkUrl(command, url) {
      command({ href: url });
      this.hideLinkMenu();
    },
    uploadImageModal(command) {
      this.uploadDialog = true;
    },
    insertImage(command) {
      if (this.remoteImage) {
        command({ src: this.remoteImage });
        this.uploadDialog = false;
      }
    },
    async upload() {
      const client = this.$apollo.getClient();
      if (this.localImage) {
        try {
          this.uploadLoading = true;
          const res = await client.mutate({
            mutation: gql`
              mutation UploadImage($file: Upload!) {
                createImage(data: { file: $file }) {
                  file {
                    publicUrl
                  }
                }
              }
            `,
            variables: {
              file: this.localImage,
            },
          });
          this.remoteImage = res.data.createImage.file.publicUrl;
          this.uploadLoading = false;
        } catch (error) {
          console.log(error);
        }
      }
    },
  },
  components: {
    EditorContent,
    EditorMenuBubble,
    EditorMenuBar,
    EditorFloatingMenu,
  },
  beforeDestroy() {
    this.editor.destroy;
  },
  data() {
    return {
      uploadDialog: false,
      uploadLoading: false,
      html: "",
      linkUrl: null,
      linkMenuIsActive: false,
      editor: null,
      remoteImage: null,
      localImage: null,
      fileError: false,
      fileValid: true,
      mdiFormatBold,
      mdiLinkPlus,
      mdiImage,
      mdiFormatItalic,
      mdiFormatStrikethrough,
      mdiFormatUnderline,
      mdiCodeTags,
      mdiFormatParagraph,
      mdiDelete,
      mdiPlus,
      mdiFormatHeader2,
      mdiFormatHeader3,
      mdiFormatListBulleted,
      mdiFormatListNumbered,
      mdiFormatQuoteOpen,
      mdiMinus,
      mdiUndo,
      mdiRedo,
    };
  },
};
</script>
<style>
.sticky {
  position: sticky;
  position: -webkit-sticky;
  top: var(--toolbarHeight);
  z-index: 5;
  background: #1E1E1E;
}
.editor {
  position: relative;
}
.ProseMirror {
  overflow-y: auto;
}
.ProseMirror:focus {
  outline: none;
}
.ProseMirror h2 {
  font-size: 2rem;
}
.ProseMirror h3 {
  font-size: 1.5rem;
}
.box__shadow {
  box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2),
    0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12);
}
.menububble {
  position: absolute;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  z-index: 20;
  background: #000;
  border-radius: 5px;
  margin-bottom: 0.5rem;
  -webkit-transform: translateX(-50%);
  transform: translateX(-50%);
  visibility: hidden;
  opacity: 0;
  -webkit-transition: opacity 0.2s, visibility 0.2s;
  transition: opacity 0.2s, visibility 0.2s;
}
.menububble.is-active {
  opacity: 1;
  visibility: visible;
}
.floating-menu {
    position: absolute;
    z-index: 1;
    margin-top: -0.5rem;
    margin-left: 1.5rem;
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.2s, visibility 0.2s;
}
.floating-menu.is-active {
  opacity: 1;
  visibility: visible;
}
</style>