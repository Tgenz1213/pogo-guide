import {defineField, defineType} from 'sanity'

export const suggestion = defineType({
  name: 'suggestion',
  title: 'Community Suggestion',
  type: 'document',
  fields: [
    defineField({
      name: 'guidePath',
      title: 'Guide Page Path',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Feedback Suggestion Content',
      type: 'text',
      validation: (Rule) => Rule.required().max(2000),
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
  ],
})
