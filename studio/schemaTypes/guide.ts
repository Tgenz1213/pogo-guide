import {defineField, defineType} from 'sanity'

export const guide = defineType({
  name: 'guide',
  title: 'Guide',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const document = context.document
          if (!value && !document?.suggestedCategory) {
            return 'Category is required if no suggested category is provided.'
          }
          return true
        }),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'tag'}]}],
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{type: 'block'}],
    }),
    defineField({
      name: 'isUserSubmitted',
      title: 'Is User Submitted',
      type: 'boolean',
      description: 'Indicates if this guide was submitted by a user and is pending review.',
      initialValue: false,
    }),
    defineField({
      name: 'suggestedCategory',
      title: 'Suggested Category',
      type: 'string',
      description: 'A new category suggested by the user.',
      hidden: ({document}) => !document?.isUserSubmitted,
    }),
    defineField({
      name: 'suggestedTags',
      title: 'Suggested Tags',
      type: 'array',
      of: [{type: 'string'}],
      description: 'New tags suggested by the user.',
      hidden: ({document}) => !document?.isUserSubmitted,
    }),
  ],
})
