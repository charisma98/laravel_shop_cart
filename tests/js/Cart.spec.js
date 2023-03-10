import {createWrapper, shallowMount} from '@vue/test-utils'
import Cart from '../../resources/assets/js/components/Cart.vue'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import {flushPromises} from './flush-promises'
import chai from 'chai'

describe('Cart.vue', () => {
    let wrapper;
    let mock;
    let response = {
        status: 200,
        data: {
            total: 155.15,
            items: 2
        }
    };
    const expect = chai.expect

    beforeEach(() => {
        wrapper = shallowMount(Cart, {
            mocks: {
                $baseUrl: 'https://my-site.com'
            },
            propsData: {
                relatedProduct: {
                    id: 123,
                    price: 518.95,
                    name: "I'm related",
                    description: 'it is description of related product',
                    image: 'image_of_related_product',
                },
                products: [
                    {
                        id: 17,
                        price: 99.99,
                        name: "I'm first",
                        description: 'it is description of first product',
                        image: 'image_of_first_product.jpg',
                        qty: 1,
                        is_related: false
                    },
                    {
                        id: 85,
                        price: 0.01,
                        name: "I'm second",
                        description: 'it is description of second product',
                        image: 'image_of_second_product.jpg',
                        qty: 88,
                        is_related: false
                    }
                ],
                shipping: [
                    {id: 1, label: 'First shipping', time: "1-2 days", rate: 15.25, selected: true},
                    {id: 2, label: 'Free shipping', time: "1 week", rate: 0, selected: false},
                ],
                payments: [
                    {id: 1, label: 'First payment', selected: false},
                    {id: 2, label: 'The Best Payment', selected: true},
                ],
            }
        })

        mock = new MockAdapter(axios)
        mock.restore()
        mock.onPost('https://my-site.com/cart/change-shipping').reply(200, response)
        mock.onPost('https://my-site.com/cart/add-to-cart').reply(200, response)
        mock.onPost('https://my-site.com/cart/remove-item').reply(200, response)
        delete global.window.location
        global.window.location = {href: '', reload: () => true}
    })

    it('find props data (product, related product and shipping method) in HTML', () => {
        expect(wrapper.html()).to.contain('it is description of related product')
        expect(wrapper.html()).to.contain('it is description of second product')
        expect(wrapper.find('select#shipping-select option').text()).to.be.eq("First shipping, 1-2 days, 15.25")
    })

    it('update row total after qty was changed', (done) => {
        expect(wrapper.find('#row-total-85').text()).to.be.eq('Total: 0.88')
        let nodeQty = wrapper.find('input#productQty85');
        nodeQty.element.value = 5
        nodeQty.trigger('change')
        flushPromises()
            .then(() => {
            expect(wrapper.find('#row-total-85').text()).to.be.eq('Total: 0.05')
        }).finally(() => (done()))

    });

    it('emit nav_cart after qty was changed', (done) => {
        let nodeQty = wrapper.find('input#productQty85')
        nodeQty.element.value = 5
        const rootWrapper = createWrapper(wrapper.vm.$root)
        nodeQty.trigger('change')
        flushPromises().then(() => {
            expect(rootWrapper.emitted().nav_cart[0][0].items).to.be.eq(2)
            expect(rootWrapper.emitted().nav_cart[0][0].total).to.be.eq(155.15)
        }).finally(() => (done()))
    })

    it('removes product from cart', (done) => {
        let nodeQty = wrapper.find('button#remove-85');
        const rootWrapper = createWrapper(wrapper.vm.$root);
        nodeQty.trigger('click');
        flushPromises().then(() => {
            expect(rootWrapper.emitted().nav_cart[0][0].items).to.be.eq(2);
            expect(rootWrapper.emitted().nav_cart[0][0].total).to.be.eq(155.15); // total from request
            expect(wrapper.find('input#productQty85').exists()).to.be.false;
            expect(wrapper.find('span#subtotal').text()).to.be.eq("" + (99.99 + 15.25)); // total of first product + shipping cost
        }).finally(() => (done()))
    });

    // it('add related product to the cart', (done) => {
    //     let related = wrapper.find('button.add-related');
    //     //const rootWrapper = createWrapper(wrapper.vm.$root);
    //
    //     mock.onPost('https://my-site.com/cart/add-related')
    //         .reply(200, {});
    //
    //     related.trigger('click');
    //     flushPromises().then(() => {
    //         expect(mockMethod).to.HaveBeenCalled()
    //     }).finally(() => (done()))
    // });

    it('payment', (done) => {
        mock.onPost('https://my-site.com/checkout')
            .reply(200, {redirect_to: wrapper.vm.baseUrl + '/payment_url'})

        wrapper.find('button#checkout').trigger('click')

        flushPromises().then(() => {
            expect(global.window.location.href).to.be.eq('https://my-site.com/payment_url')
        }).finally(() => (done()))
    })
})
