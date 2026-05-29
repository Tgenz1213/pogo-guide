import {defineField, defineType} from 'sanity'
import {isAdministrator} from './auth'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fieldsets: [
    {
      name: 'admin',
      title: 'Administrative',
      options: {collapsible: true, collapsed: false},
    },
  ],
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isUserSubmitted',
      title: 'Is User Submitted',
      type: 'boolean',
      description:
        'Indicates if this category was created from a user submission and is pending review.',
      fieldset: 'admin',
      initialValue: false,
      readOnly: ({currentUser}) => !isAdministrator(currentUser),
    }),
  ],
})
